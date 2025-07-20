import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      // Error prevention
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",

      // Best practices
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-await": "error",
      "prefer-promise-reject-errors": "error",
      "require-await": "error",

      // Code style
      "array-bracket-spacing": ["error", "never"],
      "brace-style": ["error", "1tbs", { allowSingleLine: true }],
      "comma-dangle": ["error", "always-multiline"],
      "comma-spacing": ["error", { before: false, after: true }],
      "func-call-spacing": ["error", "never"],
      indent: ["error", 2],
      "key-spacing": ["error", { beforeColon: false, afterColon: true }],
      "keyword-spacing": ["error", { before: true, after: true }],
      "linebreak-style": ["error", "unix"],
      "no-trailing-spaces": "error",
      "object-curly-spacing": ["error", "always"],
      quotes: ["error", "single", { avoidEscape: true }],
      semi: ["error", "always"],
      "space-before-blocks": ["error", "always"],
      "space-before-function-paren": [
        "error",
        {
          anonymous: "always",
          named: "never",
          asyncArrow: "always",
        },
      ],
      "space-in-parens": ["error", "never"],
      "space-infix-ops": "error",

      // ES6+
      "arrow-spacing": ["error", { before: true, after: true }],
      "no-var": "error",
      "prefer-const": ["error", { destructuring: "all" }],
      "prefer-template": "error",
      "template-curly-spacing": ["error", "never"],
    },
  },
  {
    files: ["test/**/*.js"],
    rules: {
      "no-unused-expressions": "off", // For chai assertions
    },
  },
  {
    files: ["scripts/**/*.js", "examples/**/*.js"],
    rules: {
      "no-console": "off", // Allow console in scripts and examples
      "require-await": "off", // Allow async functions without await in scripts
    },
  },
  {
    ignores: ["test-output/**/*.js"],
  },
];
