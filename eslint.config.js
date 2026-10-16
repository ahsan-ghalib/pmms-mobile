const expo = require('eslint-config-expo/flat');

module.exports = [
  { ignores: ['dist/**', 'node_modules/**', '.expo/**'] },
  ...expo,
  { rules: { 'react-hooks/refs': 'off', 'react/no-unescaped-entities': 'off' } },
];
