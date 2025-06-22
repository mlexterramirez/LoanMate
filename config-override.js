const { override, addWebpackPlugin } = require('customize-cra');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = override(
  addWebpackPlugin(
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: './index.html',
      inject: true,
    })
  )
);