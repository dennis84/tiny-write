import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'src-tauri',
      'coverage',
      'dist',
      '~*',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    rules: {
      'indent': 'off',
      'curly': ['error', 'multi-line'],
      'object-curly-spacing': 'error',
      'quotes': [2, 'single', {'avoidEscape': true, 'allowTemplateLiterals': true}],
      'no-trailing-spaces': ['error'],
      'no-multiple-empty-lines': ['error', {'max': 1, 'maxEOF': 0}],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'args': 'all',
          'argsIgnorePattern': '^_',
          'caughtErrors': 'all',
          'caughtErrorsIgnorePattern': '^_',
          'destructuredArrayIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'ignoreRestSiblings': true
        }
      ],
      //'@typescript-eslint/indent': ['error', 2, {'flatTernaryExpressions': true}],
      // '@typescript-eslint/member-delimiter-style': ['error'],
      // '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/member-ordering': 'error',
      // '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/adjacent-overload-signatures': 'off'
    }
  },
)

// export default {
//   "root": true,
//   "parser": "@typescript-eslint/parser",
//   "parserOptions": {
//     "sourceType": "module",
//     "ecmaVersion": 2022,
//     "project": ["./tsconfig.json"]
//   },
//   "env": {
//     "browser": true,
//     "node": true,
//     "es6": true
//   },
//   "extends": [
//     "eslint:recommended",
//     "plugin:@typescript-eslint/recommended",
//     "plugin:@typescript-eslint/stylistic"
//   ],
//   "rules": {
//     "indent": "off",
//     "curly": ["error", "multi-line"],
//     "object-curly-spacing": ["error", "never"],
//     "quotes": [2, "single", {"avoidEscape": true, "allowTemplateLiterals": true}],
//     "no-trailing-spaces": ["error"],
//     "no-multiple-empty-lines": ["error", {"max": 1, "maxEOF": 0}],
//     "@typescript-eslint/indent": ["error", 2, {"flatTernaryExpressions": true}],
//     "@typescript-eslint/member-delimiter-style": ["error"],
//     "@typescript-eslint/ban-ts-comment": "off",
//     "@typescript-eslint/no-explicit-any": "off",
//     "@typescript-eslint/no-non-null-assertion": "off",
//     "@typescript-eslint/member-ordering": "error",
//     "@typescript-eslint/no-floating-promises": "error",
//     "@typescript-eslint/adjacent-overload-signatures": "off"
//   }
// }
