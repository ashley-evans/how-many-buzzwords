/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: 'ts-jest/presets/js-with-ts',
    testEnvironment: 'node',
    modulePathIgnorePatterns: [
        ".aws-sam",
        "__tests__/helpers",
        "dist"
    ],
    transformIgnorePatterns: [
        "node_modules/(?!(retext))/",
        "node_modules/(?!(retext-pos))/",
        "node_modules/(?!(retext-keywords))/"
    ]
};
