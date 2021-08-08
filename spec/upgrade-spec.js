/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const path = require("path")
const fs = require("fs-plus")
const temp = require("temp")
const express = require("express")
const http = require("http")
const apm = require("../lib/apm-cli")

const apmRun = function (args, callback) {
  let ran = false
  apm.run(args, () => (ran = true))
  waitsFor(`waiting for apm ${args.join(" ")}`, 60000, () => ran)
  return runs(callback)
}

describe("apm upgrade", function () {
  let [atomApp, atomHome, packagesDir, server] = Array.from([])

  beforeEach(function () {
    spyOnToken()
    spyOnConsole()

    atomHome = temp.mkdirSync("apm-home-dir-")
    process.env.ATOM_HOME = atomHome

    const app = express()
    app.get("/packages/test-module", (request, response) =>
      response.sendFile(path.join(__dirname, "fixtures", "upgrade-test-module.json"))
    )
    app.get("/packages/multi-module", (request, response) =>
      response.sendFile(path.join(__dirname, "fixtures", "upgrade-multi-version.json"))
    )
    app.get("/packages/different-repo", (request, response) =>
      response.sendFile(path.join(__dirname, "fixtures", "upgrade-different-repo.json"))
    )
    server = http.createServer(app)

    let live = false
    server.listen(3000, "127.0.0.1", function () {
      atomHome = temp.mkdirSync("apm-home-dir-")
      atomApp = temp.mkdirSync("apm-app-dir-")
      packagesDir = path.join(atomHome, "packages")
      process.env.ATOM_HOME = atomHome
      process.env.ATOM_ELECTRON_URL = "http://localhost:3000/node"
      process.env.ATOM_PACKAGES_URL = "http://localhost:3000/packages"
      process.env.ATOM_ELECTRON_VERSION = "v10.20.1"
      process.env.ATOM_RESOURCE_PATH = atomApp

      fs.writeFileSync(path.join(atomApp, "package.json"), JSON.stringify({ version: "0.10.0" }))
      return (live = true)
    })
    return waitsFor(() => live)
  })

  afterEach(function () {
    let done = false
    server.close(() => (done = true))
    return waitsFor(() => done)
  })

  it("does not display updates for unpublished packages", function () {
    fs.writeFileSync(
      path.join(packagesDir, "not-published", "package.json"),
      JSON.stringify({ name: "not-published", version: "1.0", repository: "https://github.com/a/b" })
    )

    const callback = jasmine.createSpy("callback")
    apm.run(["upgrade", "--list", "--no-color"], callback)

    waitsFor("waiting for upgrade to complete", 600000, () => callback.callCount > 0)

    return runs(function () {
      expect(console.log).toHaveBeenCalled()
      return expect(console.log.argsForCall[1][0]).toContain("empty")
    })
  })

  it("does not display updates for packages whose engine does not satisfy the installed Atom version", function () {
    fs.writeFileSync(
      path.join(packagesDir, "test-module", "package.json"),
      JSON.stringify({ name: "test-module", version: "0.3.0", repository: "https://github.com/a/b" })
    )

    const callback = jasmine.createSpy("callback")
    apm.run(["upgrade", "--list", "--no-color"], callback)

    waitsFor("waiting for upgrade to complete", 600000, () => callback.callCount > 0)

    return runs(function () {
      expect(console.log).toHaveBeenCalled()
      return expect(console.log.argsForCall[1][0]).toContain("empty")
    })
  })

  it("displays the latest update that satisfies the installed Atom version", function () {
    fs.writeFileSync(
      path.join(packagesDir, "multi-module", "package.json"),
      JSON.stringify({ name: "multi-module", version: "0.1.0", repository: "https://github.com/a/b" })
    )

    const callback = jasmine.createSpy("callback")
    apm.run(["upgrade", "--list", "--no-color"], callback)

    waitsFor("waiting for upgrade to complete", 600000, () => callback.callCount > 0)

    return runs(function () {
      expect(console.log).toHaveBeenCalled()
      return expect(console.log.argsForCall[1][0]).toContain("multi-module 0.1.0 -> 0.3.0")
    })
  })

  it("does not display updates for packages already up to date", function () {
    fs.writeFileSync(
      path.join(packagesDir, "multi-module", "package.json"),
      JSON.stringify({ name: "multi-module", version: "0.3.0", repository: "https://github.com/a/b" })
    )

    const callback = jasmine.createSpy("callback")
    apm.run(["upgrade", "--list", "--no-color"], callback)

    waitsFor("waiting for upgrade to complete", 600000, () => callback.callCount > 0)

    return runs(function () {
      expect(console.log).toHaveBeenCalled()
      return expect(console.log.argsForCall[1][0]).toContain("empty")
    })
  })

  it("does display updates when the installed package's repository is not the same as the available package's repository", function () {
    fs.writeFileSync(
      path.join(packagesDir, "different-repo", "package.json"),
      JSON.stringify({ name: "different-repo", version: "0.3.0", repository: "https://github.com/world/hello" })
    )

    const callback = jasmine.createSpy("callback")
    apm.run(["upgrade", "--list", "--no-color"], callback)

    waitsFor("waiting for upgrade to complete", 600000, () => callback.callCount > 0)

    return runs(function () {
      expect(console.log).toHaveBeenCalled()
      return expect(console.log.argsForCall[1][0]).toContain("different-repo 0.3.0 -> 0.4.0")
    })
  })

  it("allows the package names to upgrade to be specified", function () {
    fs.writeFileSync(
      path.join(packagesDir, "multi-module", "package.json"),
      JSON.stringify({ name: "multi-module", version: "0.1.0", repository: "https://github.com/a/b" })
    )
    fs.writeFileSync(
      path.join(packagesDir, "different-repo", "package.json"),
      JSON.stringify({ name: "different-repo", version: "0.3.0", repository: "https://github.com/world/hello" })
    )

    const callback = jasmine.createSpy("callback")
    apm.run(["upgrade", "--list", "--no-color", "different-repo"], callback)

    waitsFor("waiting for upgrade to complete", 600000, () => callback.callCount > 0)

    return runs(function () {
      expect(console.log.callCount).toBe(2)
      expect(console.log.argsForCall[0][0]).not.toContain("multi-module 0.1.0 -> 0.3.0")
      expect(console.log.argsForCall[1][0]).toContain("different-repo 0.3.0 -> 0.4.0")
      return expect(console.log.argsForCall[1][0]).not.toContain("multi-module 0.1.0 -> 0.3.0")
    })
  })

  it("does not display updates when the installed package's repository does not exist", function () {
    fs.writeFileSync(
      path.join(packagesDir, "different-repo", "package.json"),
      JSON.stringify({ name: "different-repo", version: "0.3.0" })
    )

    const callback = jasmine.createSpy("callback")
    apm.run(["upgrade", "--list", "--no-color"], callback)

    waitsFor("waiting for upgrade to complete", 600000, () => callback.callCount > 0)

    return runs(function () {
      expect(console.log).toHaveBeenCalled()
      return expect(console.log.argsForCall[1][0]).toContain("empty")
    })
  })

  it("logs an error when the installed location of Atom cannot be found", function () {
    process.env.ATOM_RESOURCE_PATH = "/tmp/atom/is/not/installed/here"
    const callback = jasmine.createSpy("callback")
    apm.run(["upgrade", "--list", "--no-color"], callback)

    waitsFor("waiting for upgrade to complete", 600000, () => callback.callCount > 0)

    return runs(function () {
      expect(console.error).toHaveBeenCalled()
      return expect(console.error.argsForCall[0][0]).toContain("Could not determine current Atom version installed")
    })
  })

  it("ignores the commit SHA suffix in the version", function () {
    fs.writeFileSync(path.join(atomApp, "package.json"), JSON.stringify({ version: "0.10.0-deadbeef" }))
    fs.writeFileSync(
      path.join(packagesDir, "multi-module", "package.json"),
      JSON.stringify({ name: "multi-module", version: "0.1.0", repository: "https://github.com/a/b" })
    )

    const callback = jasmine.createSpy("callback")
    apm.run(["upgrade", "--list", "--no-color"], callback)

    waitsFor("waiting for upgrade to complete", 600000, () => callback.callCount > 0)

    return runs(function () {
      expect(console.log).toHaveBeenCalled()
      return expect(console.log.argsForCall[1][0]).toContain("multi-module 0.1.0 -> 0.3.0")
    })
  })

  return describe("for outdated git packages", function () {
    let pkgJsonPath

    beforeEach(function () {
      delete process.env.ATOM_ELECTRON_URL
      delete process.env.ATOM_PACKAGES_URL
      process.env.ATOM_ELECTRON_VERSION = "0.22.0"

      const gitRepo = path.join(__dirname, "fixtures", "test-git-repo.git")
      const cloneUrl = `file://${gitRepo}`

      return apmRun(["install", cloneUrl], function () {
        pkgJsonPath = path.join(process.env.ATOM_HOME, "packages", "test-git-repo", "package.json")
        const json = JSON.parse(fs.readFileSync(pkgJsonPath), "utf8")
        json.apmInstallSource.sha = "abcdef1234567890"
        return fs.writeFileSync(pkgJsonPath, JSON.stringify(json))
      })
    })

    it("shows an upgrade plan", () =>
      apmRun(["upgrade", "--list", "--no-color"], function () {
        const text = console.log.argsForCall.map((arr) => arr.join(" ")).join("\n")
        return expect(text).toMatch(/Available \(1\).*\n.*test-git-repo abcdef12 -> 8ae43234/)
      }))

    return it("updates to the latest sha", () =>
      apmRun(["upgrade", "-c", "false", "test-git-repo"], function () {
        const json = JSON.parse(fs.readFileSync(pkgJsonPath), "utf8")
        return expect(json.apmInstallSource.sha).toBe("8ae432341ac6708aff9bb619eb015da14e9d0c0f")
      }))
  })
})
