const config = require("../../jest.config.js");

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    ...config,
    globals: {
        "ts-jest": {
            compiler: "ttypescript",
            useESM: true,
        },
    },
    setupFiles: ["<rootDir>/../../config/ts-auto-mock-config.ts"],
    transform: {},
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
};
