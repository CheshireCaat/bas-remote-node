module.exports = {
  env: {
    commonjs: true,
    mocha: true,
    node: true,
    es6: true,
  },
  extends: [
    'plugin:chai-friendly/recommended',
    'plugin:promise/recommended',
    'plugin:node/recommended',
    'airbnb-base'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  plugins: [
    'chai-friendly',
    'promise',
    'node'
  ],
  rules: {
    'consistent-return': ['error', { treatUndefinedAsUnspecified: true }],
    'object-curly-newline': ['error', { multiline: true }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'only-multiline'],
    'linebreak-style': ['error', 'windows'],
    'function-paren-newline': 'off',
    'no-underscore-dangle': 'off',
    'prefer-object-spread': 'off',
    'no-use-before-define': 'off',
    'indent': ['error', 4],
    'no-console': 'off',
  },
};
