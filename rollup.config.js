import typescript from "rollup-plugin-typescript2";
import { uglify } from "rollup-plugin-uglify";

const licenseText = `/**
 * Copyright 2018 erdii <erdiicodes@gmail.com>
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 */`;

const defaultPlugins = [
	typescript({
		typescript: require("typescript"),
	}),
];

function createBundleConfig(dest, { output, plugins }) {
	return {
		input: "./src/index.ts",
		output: {
			file: dest,
			format: "umd",
			name: "vDomAct",
			...output,
		},

		plugins,
	}
}

export default [
	createBundleConfig("dist/vdomact.js", {
		output: {
			banner: licenseText,
		},
		plugins: defaultPlugins
	}),
	createBundleConfig("dist/vdomact.min.js", {
		output: {},
		plugins: [
			...defaultPlugins,
			uglify(),
		],
	}),
];
