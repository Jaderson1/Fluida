import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['**/dist/**', '**/node_modules/**'],
    },
    js.config.recommended,
    ...tseslint.configs.recommended
);