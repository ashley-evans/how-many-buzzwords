module.exports = {
    root: true,
    env: {
        node: true,
        es2021: true,
        'jest/globals': true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    rules: {
        indent: [
            'error',
            4,
            {
                'SwitchCase': 1
            }
        ],
        semi: [
            'error',
            'always'
        ],
        'max-len': [
            'error',
            {
                'ignoreRegExpLiterals': true,
                'ignorePattern': 'eslint-disable-next-line max-len'
            }
        ],
        'jest/no-disabled-tests': "error",
        'jest/no-focused-tests': "error",
        'jest/no-identical-title': "error",
        'jest/valid-expect': "error"
    },
    plugins: [
        'jest'
    ],
    overrides: [
        {
            files: [
                '**/*.ts',
                '**/*.tsx'
            ],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: [
                    './tsconfig.json'
                ]
            },
            plugins: [
                '@typescript-eslint',
            ],
            extends: [
                'eslint:recommended',
                'plugin:@typescript-eslint/recommended',
            ]
        }
    ]
};
