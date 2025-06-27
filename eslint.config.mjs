// eslint.config.js (ESM)
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
    {
        ignores: ['eslint.config.mjs'],
    },

    eslint.configs.recommended,

    ...tseslint.configs.recommendedTypeChecked,

    prettierRecommended,

    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: 'commonjs',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: new URL('.', import.meta.url).pathname,
            },
        },
    },

    // 5) 사용자 정의 룰
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
        },
    },
);
