module.exports = {
  env: {
    es2018: true,
    mocha: true,
    node: true,
  },
  extends: [
    'plugin:chai-friendly/recommended',
    'plugin:promise/recommended',
    'plugin:node/recommended',
    'airbnb-base'
  ],
  plugins: [
    'chai-friendly',
    'promise',
    'node'
  ],
  rules: {
    'object-curly-newline': ['error', { multiline: true }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'quote-props': ['error', 'consistent'],
    'comma-dangle': ['error', 'only-multiline'],
    'linebreak-style': ['error', 'windows'],
    'function-paren-newline': 'off',
    'promise/catch-or-return': 'off',
    'promise/always-return': 'off',
    'no-underscore-dangle': 'off',
    'prefer-object-spread': 'off',
    'no-use-before-define': 'off',
    'no-console': 'off',
  },
};
