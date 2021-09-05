const fs = require("fs")
const mv = require("mv")
const zlib = require("zlib")
const path = require("path")

const tar = require("tar")
const temp = require("temp")

const request = require("request")
const getInstallNodeVersion = require("./bundled-node-version")

temp.track()

const identifyArch = function () {
  switch (process.arch) {
    case "ia32":
      return "x86"
    case "arm":
      return `armv${process.config.variables.arm_version}l`
    default:
      return process.arch
  }
}

const downloadFileToLocation = async function (url, filename) {
    return new Promise((resolve, reject)=>{
        const stream = fs.createWriteStream(filename)
        stream.on("end", resolve)
        stream.on("error", reject)
        const requestStream = request.get(url)
        requestStream.on("response", function (response) {
            if (response.statusCode == 404) {
            console.error("download not found:", url)
            process.exit(1)
            }
            requestStream.pipe(stream)
        })
    })
}

const downloadTarballAndExtract = function (url, location) {
    return new Promise((resolve, reject)=>{
        const tempPath = temp.mkdirSync("apm-node-")
        const stream = tar.extract({
            cwd: tempPath,
        })
        stream.on("end", function () {
            resolve.call(this, tempPath)
        })
        stream.on("error", reject)
        const requestStream = request.get(url)
        requestStream.on("response", function (response) {
            if (response.statusCode == 404) {
            console.error("download not found:", url)
            process.exit(1)
            }
            requestStream.pipe(zlib.createGunzip()).pipe(stream)
        })
    })
}

const copyNodeBinToLocation = async function (version, targetFilename, fromDirectory) {
    return new Promise((resolve, reject)=>{
        const arch = identifyArch()
        const subDir = `node-${version}-${process.platform}-${arch}`
        const downloadedNodePath = path.join(fromDirectory, subDir, "bin", "node")
        let output
        output = mv(downloadedNodePath, targetFilename, { mkdirp: true }, function (err) {
            if (err) {
                reject(err)
                return
            }

            fs.chmodSync(targetFilename, "755")
            resolve(output)
        })
    })
}

const downloadNode = async function (version, ) {
    try {
        const arch = identifyArch()
        const filename = path.join(__dirname, "..", "bin", process.platform === "win32" ? "node.exe" : "node")

        const downloadFile = async function () {
            if (process.platform === "win32") {
                return downloadFileToLocation(`https://nodejs.org/dist/${version}/win-${arch}/node.exe`, filename)
            } else {
                const next = await copyNodeBinToLocation.bind(this, version, filename)
                return downloadTarballAndExtract(
                    `https://nodejs.org/dist/${version}/node-${version}-${process.platform}-${arch}.tar.gz`,
                    filename,
                )
            }
        }

        if (fs.existsSync(filename)) {
            try {
                var [installedVersion, installedArch] = await getInstallNodeVersion(filename)
            } catch (error) {
                console.warn("Warning: issues when checking node version", error)
            }
            if (installedVersion !== version || installedArch !== process.arch) {
                downloadFile()
            }
        } else {
            downloadFile()
        }
    } catch (error) {
        console.error("Failed to download node", error)
        return process.exit(1)
    }
    return process.exit(0)
}

const versionToInstall = fs.readFileSync(path.resolve(__dirname, "..", ".npmrc"), "utf8").match(/target=(.*)\n/)[1]
downloadNode(versionToInstall)
