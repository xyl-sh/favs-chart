import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import { FlatCompat } from "@eslint/eslintrc";

/** @type { import("eslint").Linter.Config[] } */
export default [
	...new FlatCompat().extends("eslint-config-airbnb"),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
		},
	},
	eslintConfigPrettier,
];
