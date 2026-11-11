const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = [
  { ignores: ['dist', 'coverage'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['test/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
    languageOptions: {
      globals: { Buffer: 'readonly', URLSearchParams: 'readonly', require: 'readonly', module: 'readonly' },
    },
  },
];
