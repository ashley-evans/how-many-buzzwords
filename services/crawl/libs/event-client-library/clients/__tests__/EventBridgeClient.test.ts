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

const mockEventBridgeClient = mockClient(EBClient);

const client = new EventBridgeClient(EXPECTED_EVENT_BUS_NAME);

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
});

beforeEach(() => {
    mockEventBridgeClient.reset();
});

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
        mockEventBridgeClient.on(PutEventsCommand).rejects(new Error());

        const response = await client.sentStatusUpdate(
            VALID_URL.hostname,
            VALID_STATUS
        );

        expect(response).toEqual(false);
    });
});

describe("new URL publishing", () => {
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
        mockEventBridgeClient.on(PutEventsCommand).rejects(new Error());

        const actual = await client.publishURL(VALID_URL);

        expect(actual).toEqual(false);
    });
});
