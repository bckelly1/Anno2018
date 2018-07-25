const path = require("path");
const webpack = require("webpack");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const GitRevisionPlugin = require("git-revision-webpack-plugin");
const gitRevisionPlugin = new GitRevisionPlugin({
  // branch: true,
});

/* tslint:disable */
module.exports = {
  entry: {
    app: [
      "idb.filesystem.js",
      "@babel/polyfill",
      "./src/index.ts",
    ]
  },
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    contentBase: "./dist",
    hot: true,
  },
  plugins: [
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    gitRevisionPlugin,
    new webpack.DefinePlugin({
      '__VERSION__': JSON.stringify(gitRevisionPlugin.version()),
      // '__COMMITHASH__': JSON.stringify(gitRevisionPlugin.commithash()),
      // '__BRANCH__': JSON.stringify(gitRevisionPlugin.branch()),
    })
  ],
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
          parallel: true,
      })
    ]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ['@babel/preset-env']
            },
          },
          {
            loader: "ts-loader",
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ ".tsx", ".ts", ".js" ],
  },
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
};
