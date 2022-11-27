const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
	entry: './frontend/index.js',
	mode: 'development',
	devtool: false,
	output: {
		filename : 'dist/base.js',
		path: __dirname
	},

	optimization: {
		concatenateModules: true
	},

	plugins: [
		new MiniCssExtractPlugin({
			filename: 'dist/base.css',
		}),
	],

	module: {
		rules: [
			{
				test: /\.css$/i,
				use: [
					MiniCssExtractPlugin.loader,

					'css-loader'
				],
			}
		]
	}
}