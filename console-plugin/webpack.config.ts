import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Configuration } from 'webpack';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import { ConsoleRemotePlugin } from '@openshift-console/dynamic-plugin-sdk-webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WebpackConfig extends Configuration {
  devServer?: DevServerConfiguration;
}

const config: WebpackConfig = {
  mode: 'development',
  entry: {},
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]-bundle.js',
    chunkFilename: '[name]-chunk.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [new ConsoleRemotePlugin()],
  devServer: {
    port: 9001,
    static: path.join(__dirname, 'dist'),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};

export default config;
