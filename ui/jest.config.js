/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: "ts-jest/presets/js-with-ts",
    testEnvironment: "jsdom",
    modulePathIgnorePatterns: [".npm-cache", "node_modules"],
    runner: "groups",
    setupFilesAfterEnv: ["<rootDir>/config/jest-setup.ts"],
};
