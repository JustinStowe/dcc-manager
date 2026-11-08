import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores(['.next/**', 'coverage/**', 'next-env.d.ts']),
  {
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="style"]',
          message: 'Keep styling in CSS files and use className.',
        },
        {
          selector: 'JSXAttribute > JSXExpressionContainer > ArrowFunctionExpression',
          message: 'Use a named controller handler instead of an inline function.',
        },
        {
          selector: 'JSXAttribute > JSXExpressionContainer > FunctionExpression',
          message: 'Use a named controller handler instead of an inline function.',
        },
      ],
    },
  },
]);
