'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node
    },
    rules: {
      strict: ['error', 'global'],
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'max-len': ['warn', { code: 100, ignoreUrls: true, ignoreStrings: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
