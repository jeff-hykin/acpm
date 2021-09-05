const nodeTarget = require("fysh")
  .readFileSync("./.npmrc", "utf8")
  .match(/target=(.*)\n/)[1]

module.exports = {
  presets: [
    [
      "babel-preset-atomic",
      {
        targets: {
          node: nodeTarget,
        },
        flow: false,
        react: false,
      },
    ],
  ],
  exclude: "node_modules/**",
  sourceMap: "inline",
}
