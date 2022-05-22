/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: "ts-jest/presets/js-with-ts",
    testEnvironment: "node",
    modulePathIgnorePatterns: [
        ".npm-cache",
        "node_modules",
        "__tests__/helpers",
    ],
    runner: "groups",
    globals: {
        "ts-jest": {
            compiler: "ttypescript",
        },
    },
    setupFiles: ["<rootDir>/config/ts-auto-mock-config.ts"],
};
