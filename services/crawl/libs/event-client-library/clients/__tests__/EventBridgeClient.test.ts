import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import {
    EventBridgeClient as EBClient,
    PutEventsCommand,
    PutEventsCommandOutput,
} from "@aws-sdk/client-eventbridge";
import { SinonSpyCall } from "sinon";
import { CrawlStatus } from "buzzword-crawl-urls-repository-library";

import EventBridgeClient from "../EventBridgeClient";

const VALID_URL = new URL("https://www.example.com/test");
const VALID_STATUS = CrawlStatus.COMPLETE;
const EXPECTED_EVENT_BUS_NAME = "test_event_bus";
const EXPECTED_BATCH_SIZE = 10;

const mockEventBridgeClient = mockClient(EBClient);

const client = new EventBridgeClient(EXPECTED_EVENT_BUS_NAME);

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
});

beforeEach(() => {
    mockEventBridgeClient.reset();
    mockEventBridgeClient.on(PutEventsCommand).resolves({});
});

function createURLs(num: number): URL[] {
    const urls: URL[] = [];
    for (let i = 0; i < num; i++) {
        urls.push(new URL(`https://www.example${i}.com`));
    }

    return urls;
}

describe("status update publishing", () => {
    test("sends a single event for the provided status", async () => {
        await client.sentStatusUpdate(VALID_URL.hostname, VALID_STATUS);

        expect(mockEventBridgeClient).toHaveReceivedCommandTimes(
            PutEventsCommand,
            1
        );
    });

    test("sends the event bus name in the event", async () => {
        await client.sentStatusUpdate(VALID_URL.hostname, VALID_STATUS);

        expect(mockEventBridgeClient).toHaveReceivedCommandWith(
            PutEventsCommand,
            {
                Entries: [
                    expect.objectContaining({
                        EventBusName: EXPECTED_EVENT_BUS_NAME,
                    }),
                ],
            }
        );
    });

    test("sends the crawl status detail type in the event entry", async () => {
        const expectedDetailType = "Crawl Status Update";

        await client.sentStatusUpdate(VALID_URL.hostname, VALID_STATUS);

        expect(mockEventBridgeClient).toHaveReceivedCommandWith(
            PutEventsCommand,
            {
                Entries: [
                    expect.objectContaining({
                        DetailType: expectedDetailType,
                    }),
                ],
            }
        );
    });

    test("sends the buzzword crawl source in the event entry", async () => {
        const expectedSource = "crawl.aws.buzzword";

        await client.sentStatusUpdate(VALID_URL.hostname, VALID_STATUS);

        expect(mockEventBridgeClient).toHaveReceivedCommandWith(
            PutEventsCommand,
            {
                Entries: [
                    expect.objectContaining({
                        Source: expectedSource,
                    }),
                ],
            }
        );
    });

    test("sends a JSON message in the entry detail", async () => {
        await client.sentStatusUpdate(VALID_URL.hostname, VALID_STATUS);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const entries = calls[0].args[0].input.Entries;

        expect(() =>
            JSON.parse(entries?.[0].Detail || "invalid")
        ).not.toThrowError();
    });

    test("sends the provided URL in the entry detail", async () => {
        const expectedURLKey = "baseURL";

        await client.sentStatusUpdate(VALID_URL.hostname, VALID_STATUS);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const detail = JSON.parse(
            calls[0].args[0].input.Entries?.[0].Detail || "unexpected"
        );

        expect(detail[expectedURLKey]).toEqual(VALID_URL.hostname);
    });

    test("sends the provided status in the entry detail", async () => {
        const expectedStatusKey = "status";

        await client.sentStatusUpdate(VALID_URL.hostname, VALID_STATUS);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const detail = JSON.parse(
            calls[0].args[0].input.Entries?.[0].Detail || "unexpected"
        );

        expect(detail[expectedStatusKey]).toEqual(VALID_STATUS);
    });

    test("returns success given event is succesfully sent", async () => {
        const response = await client.sentStatusUpdate(
            VALID_URL.hostname,
            VALID_STATUS
        );

        expect(response).toEqual(true);
    });

    test("returns failure if an unknown error occurs during sending of event", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        mockEventBridgeClient.reset();
        mockEventBridgeClient.on(PutEventsCommand).rejects(new Error());

        const response = await client.sentStatusUpdate(
            VALID_URL.hostname,
            VALID_STATUS
        );

        expect(response).toEqual(false);
    });

    test("returns failure if the status update entry fails to be ingested", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        mockEventBridgeClient.reset();
        mockEventBridgeClient.on(PutEventsCommand).resolves({
            FailedEntryCount: 1,
            Entries: [
                {
                    ErrorCode: "Test",
                    ErrorMessage: "Test Failure",
                },
            ],
        });

        const actual = await client.sentStatusUpdate(
            VALID_URL.hostname,
            VALID_STATUS
        );

        expect(actual).toEqual(false);
    });
});

describe("new URL publishing given a single URL", () => {
    test("returns success given event is successfully sent", async () => {
        const actual = await client.publishURL(VALID_URL);

        expect(actual).toBe(true);
    });

    test("sends a single event for the provided URL", async () => {
        await client.publishURL(VALID_URL);

        expect(mockEventBridgeClient).toHaveReceivedCommandTimes(
            PutEventsCommand,
            1
        );
    });

    test("sends the event bus name in the event", async () => {
        await client.publishURL(VALID_URL);

        expect(mockEventBridgeClient).toHaveReceivedCommandWith(
            PutEventsCommand,
            {
                Entries: [
                    expect.objectContaining({
                        EventBusName: EXPECTED_EVENT_BUS_NAME,
                    }),
                ],
            }
        );
    });

    test("sends the new crawl detail type in the event", async () => {
        const expectedDetailType = "New URL Crawled via Crawl Service";

        await client.publishURL(VALID_URL);

        expect(mockEventBridgeClient).toHaveReceivedCommandWith(
            PutEventsCommand,
            {
                Entries: [
                    expect.objectContaining({
                        DetailType: expectedDetailType,
                    }),
                ],
            }
        );
    });

    test("sends the buzzword crawl source in the event entry", async () => {
        const expectedSource = "crawl.aws.buzzword";

        await client.publishURL(VALID_URL);

        expect(mockEventBridgeClient).toHaveReceivedCommandWith(
            PutEventsCommand,
            {
                Entries: [
                    expect.objectContaining({
                        Source: expectedSource,
                    }),
                ],
            }
        );
    });

    test("sends a JSON message in the entry detail", async () => {
        await client.publishURL(VALID_URL);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const entries = calls[0].args[0].input.Entries;

        expect(() =>
            JSON.parse(entries?.[0].Detail || "invalid")
        ).not.toThrowError();
    });

    test("sends the provided URLs hostname as base URL in the entry detail", async () => {
        const expectedURLKey = "baseURL";

        await client.publishURL(VALID_URL);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const detail = JSON.parse(
            calls[0].args[0].input.Entries?.[0].Detail || "unexpected"
        );

        expect(detail[expectedURLKey]).toEqual(VALID_URL.hostname);
    });

    test("sends the provided URLs pathname in the entry detail", async () => {
        const expectedPathnameKey = "pathname";

        await client.publishURL(VALID_URL);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const detail = JSON.parse(
            calls[0].args[0].input.Entries?.[0].Detail || "unexpected"
        );

        expect(detail[expectedPathnameKey]).toEqual(VALID_URL.pathname);
    });

    test("returns failure if an unknown error occurs during sending of event", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        mockEventBridgeClient.reset();
        mockEventBridgeClient.on(PutEventsCommand).rejects(new Error());

        const actual = await client.publishURL(VALID_URL);

        expect(actual).toEqual(false);
    });

    test("returns failure if the URL publish entry fails to be ingested", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        mockEventBridgeClient.reset();
        mockEventBridgeClient.on(PutEventsCommand).resolves({
            FailedEntryCount: 1,
            Entries: [
                {
                    ErrorCode: "Test",
                    ErrorMessage: "Test Failure",
                },
            ],
        });

        const actual = await client.publishURL(VALID_URL);

        expect(actual).toEqual(false);
    });
});

describe("new URL publishing given 10 URLs", () => {
    const urls = createURLs(10);

    test("returns an empty array given event is successfully sent", async () => {
        const actual = await client.publishURL(urls);

        expect(actual).toEqual([]);
    });

    test("sends a single event for the provided URLs", async () => {
        await client.publishURL(urls);

        expect(mockEventBridgeClient).toHaveReceivedCommandTimes(
            PutEventsCommand,
            1
        );
    });

    test("sends the crawl event bus name in every entry in the event", async () => {
        await client.publishURL(urls);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const entries = calls[0].args[0].input.Entries;

        expect(entries).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const entry of entries!) {
            expect(entry).toEqual(
                expect.objectContaining({
                    EventBusName: EXPECTED_EVENT_BUS_NAME,
                })
            );
        }
    });

    test("sends the new crawl detail type in every entry in the event", async () => {
        const expectedDetailType = "New URL Crawled via Crawl Service";

        await client.publishURL(urls);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const entries = calls[0].args[0].input.Entries;

        expect(entries).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const entry of entries!) {
            expect(entry).toEqual(
                expect.objectContaining({
                    DetailType: expectedDetailType,
                })
            );
        }
    });

    test("sends the buzzword crawl source in the every entry in the event", async () => {
        const expectedSource = "crawl.aws.buzzword";

        await client.publishURL(urls);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const entries = calls[0].args[0].input.Entries;

        expect(entries).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const entry of entries!) {
            expect(entry).toEqual(
                expect.objectContaining({
                    Source: expectedSource,
                })
            );
        }
    });

    test("sends a valid JSON message in the every entry in the event", async () => {
        await client.publishURL(VALID_URL);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const entries = calls[0].args[0].input.Entries;

        expect(entries).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const entry of entries!) {
            expect(() =>
                JSON.parse(entry.Detail || "invalid")
            ).not.toThrowError();
        }
    });

    test("sends the provided URLs in seperate entries in the event", async () => {
        await client.publishURL(urls);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);
        const entries = calls[0].args[0].input.Entries;

        for (const url of urls) {
            const expectedDetail = JSON.stringify({
                baseURL: url.hostname,
                pathname: url.pathname,
            });

            expect(entries).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        Detail: expectedDetail,
                    }),
                ])
            );
        }
    });

    test("returns each provided URL if an error occurs sending the event", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        mockEventBridgeClient.reset();
        mockEventBridgeClient.on(PutEventsCommand).rejects(new Error());

        const actual = await client.publishURL(urls);

        expect(actual).toEqual(expect.arrayContaining(urls));
    });
});

describe("new URL publishing given more than 10 urls", () => {
    const urls = createURLs(15);

    test("returns an empty array given event is successfully sent", async () => {
        const actual = await client.publishURL(urls);

        expect(actual).toEqual([]);
    });

    test("sends an event for each batch of 10 URLs provided", async () => {
        await client.publishURL(urls);

        expect(mockEventBridgeClient).toHaveReceivedCommandTimes(
            PutEventsCommand,
            2
        );
    });

    test("sends the expected number of entries per event", async () => {
        await client.publishURL(urls);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);

        expect(calls[0].args[0].input.Entries).toHaveLength(
            EXPECTED_BATCH_SIZE
        );
        expect(calls[1].args[0].input.Entries).toHaveLength(
            urls.length - EXPECTED_BATCH_SIZE
        );
    });

    test("sends the crawl event bus name in every entry in each event", async () => {
        await client.publishURL(urls);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);

        for (const call of calls) {
            const entries = call.args[0].input.Entries;

            expect(entries).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            for (const entry of entries!) {
                expect(entry).toEqual(
                    expect.objectContaining({
                        EventBusName: EXPECTED_EVENT_BUS_NAME,
                    })
                );
            }
        }
    });

    test("sends the new crawl detail type in every entry in each event", async () => {
        const expectedDetailType = "New URL Crawled via Crawl Service";

        await client.publishURL(urls);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);

        for (const call of calls) {
            const entries = call.args[0].input.Entries;

            expect(entries).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            for (const entry of entries!) {
                expect(entry).toEqual(
                    expect.objectContaining({
                        DetailType: expectedDetailType,
                    })
                );
            }
        }
    });

    test("sends the buzzword crawl source in the every entry in each event", async () => {
        const expectedSource = "crawl.aws.buzzword";

        await client.publishURL(urls);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);

        for (const call of calls) {
            const entries = call.args[0].input.Entries;

            expect(entries).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            for (const entry of entries!) {
                expect(entry).toEqual(
                    expect.objectContaining({
                        Source: expectedSource,
                    })
                );
            }
        }
    });

    test("sends each URL in a seperate entry in the sent events", async () => {
        await client.publishURL(urls);
        const calls: SinonSpyCall<
            [PutEventsCommand],
            Promise<PutEventsCommandOutput>
        >[] = mockEventBridgeClient.commandCalls(PutEventsCommand);

        const entries = calls.map((call) => call.args[0].input.Entries).flat();
        for (const url of urls) {
            const expectedDetail = JSON.stringify({
                baseURL: url.hostname,
                pathname: url.pathname,
            });

            expect(entries).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        Detail: expectedDetail,
                    }),
                ])
            );
        }
    });

    test("returns each provided URL if an error occurs sending the event", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        mockEventBridgeClient.reset();
        mockEventBridgeClient.on(PutEventsCommand).rejects(new Error());

        const actual = await client.publishURL(urls);

        expect(actual).toEqual(expect.arrayContaining(urls));
    });
});

test("returns failed URLs given one entry in batch failed", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const urls = createURLs(2);
    const expectedFailedURL = urls[1];
    mockEventBridgeClient.reset();
    mockEventBridgeClient.on(PutEventsCommand).resolves({
        FailedEntryCount: 1,
        Entries: [
            {
                EventId: "worked",
            },
            {
                ErrorCode: "Test",
                ErrorMessage: "Test Failure",
            },
        ],
    });

    const actual = await client.publishURL(urls);

    expect(actual).toEqual(expect.arrayContaining([expectedFailedURL]));
});
