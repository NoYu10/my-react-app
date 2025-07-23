const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: {
    popup: "./src/popup.tsx",
    background: "./src/background.ts"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: "popup.html",
      template: "public/popup.html",
      chunks: ["popup"]
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "public/manifest.json", to: "manifest.json" },
        { from: "public/*.png", to: "[name][ext]", noErrorOnMissing: true },
        { from: "src/background.ts", to: "background.js", transform: (content) => {
          // TypeScriptファイルをJavaScriptに変換（簡易版）
          return content.toString().replace(/\/\/.*$/gm, '').replace(/\n\s*\n/g, '\n');
        }}
      ]
    })
  ]
};
