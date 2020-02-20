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
    'linebreak-style': ['error', 'windows'],
    'promise/catch-or-return': 'off',
    'promise/always-return': 'off',
    'quotes': ['error', 'single'],
    'indent': ['error', 4]
  },
};
