const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    popup: path.resolve('src/index.tsx')
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              noEmit: false,
            },
          },
        }
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: path.resolve('public'), 
          to: path.resolve('dist')
        }
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.resolve('src/index.html'),
      filename: 'index.html',
      chunks: ['popup'],
      cache: false,
    }),
  ],
  output: {
    filename: '[name].js',
    path: path.resolve('dist'),
    clean: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
}; 