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
    'object-curly-newline': ['error', { 'multiline': true }],
    'quotes': ['error', 'single', {'avoidEscape': true}],
    'comma-dangle': ['error', 'only-multiline'],
    'linebreak-style': ['error', 'windows'],
    'function-paren-newline': 'off',
    'promise/catch-or-return': 'off',
    'promise/always-return': 'off',
    'no-underscore-dangle': 'off',
    'prefer-object-spread': 'off',
    'indent': ['error', 4]
  },
};
