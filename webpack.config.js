const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

// required for errors to appear in --watch mode (see
// https://github.com/s-panferov/awesome-typescript-loader#configuration)
const { CheckerPlugin } = require('awesome-typescript-loader');

module.exports = {
  entry: {
    script: "./src/js/main.tsx",
    styles: "./src/styles/main.sass"
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "[name].js"
  },
  mode: "development",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'awesome-typescript-loader'
      },
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['react', 'env'],
          plugins: ['transform-class-properties']
        }
      },
      {
        test: /\.sass$/,
        use: ExtractTextPlugin.extract(
          {
            fallback: 'style-loader',
            use: ['css-loader', 'sass-loader']
          }
        )
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  },
  plugins: [
    new CheckerPlugin(),
    new ExtractTextPlugin({
      filename: '[name].css',
      allChunks: true
    })
  ]
}
