/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const path = require("path")
const temp = require("temp")
const fs = require("fs")
import * as apm from "../lib/apm-cli"

describe("apm command line interface", function () {
  beforeEach(function () {
    spyOnConsole()
    spyOnToken()
  })

  describe("when no arguments are present", () =>
    it("prints a usage message", function () {
      apm.run([])
      expect(console.log).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
      expect(console.error.argsForCall[0][0].length).toBeGreaterThan(0)
    }))

  describe("when the help flag is specified", () =>
    it("prints a usage message", function () {
      apm.run(["-h"])
      expect(console.log).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
      expect(console.error.argsForCall[0][0].length).toBeGreaterThan(0)
    }))

  describe("when the version flag is specified", () =>
    it("prints the version", function () {
      const callback = jasmine.createSpy("callback")
      apm.run(["-v", "--no-color"], callback)

      const testAtomVersion = "0.0.0"
      const tempAtomResourcePath = temp.mkdirSync("apm-resource-dir-")
      fs.writeFileSync(path.join(tempAtomResourcePath, "package.json"), JSON.stringify({ version: testAtomVersion }))
      process.env.ATOM_RESOURCE_PATH = tempAtomResourcePath

      waitsFor(() => callback.callCount === 1)

      runs(function () {
        expect(console.error).not.toHaveBeenCalled()
        expect(console.log).toHaveBeenCalled()
        const lines = console.log.argsForCall[0][0].split("\n")
        expect(lines[0]).toBe(`apm  ${require("../package.json").version}`)
        expect(lines[1]).toBe(`pnpm  ${require("pnpm/package.json").version}`)
        expect(lines[2]).toBe(`node ${process.versions.node} ${process.arch}`)
        expect(lines[3]).toBe(`atom ${testAtomVersion}`)
      })
    }))

  describe("when the version flag is specified but env.ATOM_RESOURCE_PATH is not set", function () {
    it("finds the installed Atom and prints the version", function () {
      const callback = jasmine.createSpy("callback")
      apm.run(["-v", "--no-color"], callback)

      process.env.ATOM_RESOURCE_PATH = ""

      waitsFor(() => callback.callCount === 1)

      runs(function () {
        expect(console.error).not.toHaveBeenCalled()
        expect(console.log).toHaveBeenCalled()
        const lines = console.log.argsForCall[0][0].split("\n")
        expect(lines[0]).toBe(`apm  ${require("../package.json").version}`)
        expect(lines[1]).toBe(`pnpm  ${require("pnpm/package.json").version}`)
        expect(lines[2]).toBe(`node ${process.versions.node} ${process.arch}`)
      })
    })

    describe("when the version flag is specified and apm is unable find package.json on the resourcePath", () =>
      it("prints unknown atom version", function () {
        const callback = jasmine.createSpy("callback")
        apm.run(["-v", "--no-color"], callback)

        const testAtomVersion = "unknown"
        const tempAtomResourcePath = temp.mkdirSync("apm-resource-dir-")
        process.env.ATOM_RESOURCE_PATH = tempAtomResourcePath

        waitsFor(() => callback.callCount === 1)

        runs(function () {
          expect(console.error).not.toHaveBeenCalled()
          expect(console.log).toHaveBeenCalled()
          const lines = console.log.argsForCall[0][0].split("\n")
          expect(lines[3]).toBe(`atom ${testAtomVersion}`)
        })
      }))
  })

  describe("when an unrecognized command is specified", () =>
    it("prints an error message and exits", function () {
      const callback = jasmine.createSpy("callback")
      apm.run(["this-will-never-be-a-command"], callback)
      expect(console.log).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
      expect(console.error.argsForCall[0][0].length).toBeGreaterThan(0)
      expect(callback.mostRecentCall.args[0]).not.toBeUndefined()
    }))
})
