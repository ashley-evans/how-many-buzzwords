/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: "ts-jest/presets/js-with-ts",
    testEnvironment: "jsdom",
    modulePathIgnorePatterns: ["__tests__/helpers"],
    roots: ["src"],
    runner: "groups",
    setupFilesAfterEnv: ["<rootDir>/config/jest-setup.ts"],
    moduleNameMapper: {
        "\\.(css|less)$": "identity-obj-proxy",
        uuid: require.resolve("uuid"), // See: https://github.com/uuidjs/uuid/issues/451. Required until dependencies update to uuid v9+
    },
};
