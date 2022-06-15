const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const DotEnv = require("dotenv-webpack");

module.exports = () => {
    return {
        entry: "./src/index.tsx",
        output: {
            path: path.join(__dirname, "dist"),
            filename: "index.bundle.js",
        },
        resolve: {
            extensions: [".tsx", ".ts", ".js", ".jsx"],
        },
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules/,
                    use: ["babel-loader"],
                },
                {
                    test: /\.(ts|tsx)$/,
                    exclude: /node_modules/,
                    use: ["ts-loader"],
                },
                {
                    test: /\.(css)$/,
                    use: ["style-loader", "css-loader"],
                },
                {
                    test: /\.(jpg|jpeg|png|gif|mp3|svg)$/,
                    use: ["file-loader"],
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: path.join(__dirname, "public", "index.html"),
                publicPath: "/",
            }),
            new DotEnv(),
        ],
        devServer: {
            static: path.join(__dirname, "public"),
            port: 3000,
            hot: "only",
            compress: true,
            open: true,
            historyApiFallback: {
                disableDotRule: true,
            },
        },
    };
};
