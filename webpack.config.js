const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: {
    script: "./src/js/main.js",
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
  plugins: [ 
    new ExtractTextPlugin({
      filename: '[name].css',
      allChunks: true
    })
  ]
}
