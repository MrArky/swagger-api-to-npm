const webpack = require("webpack");
const path = require('path');
const fs = require('fs');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
module.exports = (env) => ({
    //webpack 打包时js的入口
    entry: {
        myRequest: './src/myRequest.ts',
        ...fs.readdirSync('./src/swagger').filter(filename => !filename.endsWith('.d.ts')).reduce((entries, filename) => {
            Reflect.defineProperty(entries, filename.split('.')[0], {
                value: './src/swagger/' + filename, configurable: true,
                enumerable: true,
                writable: true
            });
            return entries;
        }, {})
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        //打包后js名称，支持路径+名称
        filename: (pathData) => {
            return './swagger/[name]/index.js';
        },
        //每次打包前清空文件
        clean: true,
        // 发布到npm库的相关信息
        // name是发布到npm时的库名，别人安装就是安装它
        // type是暴露库的形式，umd就表示别人可以在所有模块定义下引入这个库
        // 比如CommonJs AMD 和全局变量的形式
        // export用来指定哪一个导出应该被暴露为一个库
        // 'default'就是我们默认导出的库
        library: {
            name: 'ntfa-api',
            type: 'umd',
            // export: 'default'
        },
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                //打包时ES6+转换排除node_modules依赖
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-typescript']
                    }
                }
            },
            ...env && env.production ? [] : [{
                test: /\.tsx?$/,
                use: {
                    loader: 'awesome-typescript-loader',
                    options: {
                        // transpileOnly: true,
                        errorsAsWarnings: true,
                        reportFiles: ["/src/swagger/**/*.{ts,tsx}"],
                        // silent: true,
                        useCache: false,
                    }
                },
                exclude: /node_modules|webpack\.config\.ts|\.d\.ts/,
            }],
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        /**
        * 由于使用组件时，需要有 ts 支持，因此将 ts 定义需要拷贝过去
        */
        new CopyPlugin({
            patterns: [
                { from: "**/*.d.ts", to: "swagger/[name][ext]", context: path.resolve(__dirname, "src/swagger", "") },
                { from: "myRequest.d.ts", to: "swagger/myRequest/index.d.ts", context: path.resolve(__dirname, "src", "") },
            ],
        }),
        new webpack.DefinePlugin({
            __DEV__: true,
            __PROFILE__: true,
            __EXPERIMENTAL__: true,
            __UMD__: true,
        }),
    ],
    // devtool: 'source-map',
    mode: env && env.production ? 'production' : 'development',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.less']
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]src[\\/]/, // 匹配你的源码目录
                    name: 'common', // 提取出的公共模块的名称
                    chunks: 'async',
                },
            },
        },
    },
    //打包时不将以下依赖打包进index.js，需要引用组件的项目提前npm好
    externals: {
        'antd': 'antd',
        'antd/lib/message': 'antd/lib/message',
        'antd/lib/notification': 'antd/lib/notification',
        'moment': 'moment',
        'umi-request': 'umi-request',
        'umi-request-progress': 'umi-request-progress',
        'json-bigint': 'json-bigint',
        'qs': 'qs',
    },
})