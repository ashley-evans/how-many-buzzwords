import type { PlaywrightTestConfig } from "@playwright/experimental-ct-react";
import { devices } from "@playwright/experimental-ct-react";

const config: PlaywrightTestConfig = {
    testDir: "./tests/component/",
    snapshotDir: "./tests/component/__snapshots__",
    timeout: 10 * 1000,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 4 : undefined,
    reporter: "list",
    use: {
        trace: "on-first-retry",
        ctPort: 3100,
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
    ],
    expect: {
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.01,
        },
    },
};

export default config;
