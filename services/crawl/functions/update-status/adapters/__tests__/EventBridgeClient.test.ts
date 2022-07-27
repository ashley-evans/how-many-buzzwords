import { mockClient } from "aws-sdk-client-mock";
import {
    EventBridgeClient as EBClient,
    PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { CrawlStatus } from "buzzword-aws-crawl-urls-repository-library";

import EventBridgeClient from "../EventBridgeClient";

const VALID_HOSTNAME = "www.example.com";
const VALID_STATUS = CrawlStatus.COMPLETE;

const EXPECTED_EVENT_BUS_NAME = "test_event_bus";

const mockEventBridgeClient = mockClient(EBClient);

const client = new EventBridgeClient(EXPECTED_EVENT_BUS_NAME);

beforeEach(() => {
    mockEventBridgeClient.reset();
});

test("sends a single event and entry for the provided status", async () => {
    await client.sentStatusUpdate(VALID_HOSTNAME, VALID_STATUS);
    const calls = mockEventBridgeClient.commandCalls(PutEventsCommand);

    expect(calls).toHaveLength(1);
    expect(calls[0].args).toHaveLength(1);
});

test("sends a single entry in the event", async () => {
    await client.sentStatusUpdate(VALID_HOSTNAME, VALID_STATUS);
    const calls = mockEventBridgeClient.commandCalls(PutEventsCommand);
    const entries = calls[0].args[0].input.Entries;

    expect(entries).toHaveLength(1);
});

test("sends the event bus name in the event entry", async () => {
    await client.sentStatusUpdate(VALID_HOSTNAME, VALID_STATUS);
    const calls = mockEventBridgeClient.commandCalls(PutEventsCommand);
    const entries = calls[0].args[0].input.Entries;

    expect(entries?.[0].EventBusName).toEqual(EXPECTED_EVENT_BUS_NAME);
});

test("sends the crawl status detail type in the event entry", async () => {
    const expectedDetailType = "Crawl Complete via Crawl Service";

    await client.sentStatusUpdate(VALID_HOSTNAME, VALID_STATUS);
    const calls = mockEventBridgeClient.commandCalls(PutEventsCommand);
    const entries = calls[0].args[0].input.Entries;

    expect(entries?.[0].DetailType).toEqual(expectedDetailType);
});

test("sends the buzzword crawl source in the event entry", async () => {
    const expectedSource = "crawl.aws.buzzword";

    await client.sentStatusUpdate(VALID_HOSTNAME, VALID_STATUS);
    const calls = mockEventBridgeClient.commandCalls(PutEventsCommand);
    const entries = calls[0].args[0].input.Entries;

    expect(entries?.[0].Source).toEqual(expectedSource);
});

test("sends a JSON message in the entry detail", async () => {
    await client.sentStatusUpdate(VALID_HOSTNAME, VALID_STATUS);
    const calls = mockEventBridgeClient.commandCalls(PutEventsCommand);
    const entries = calls[0].args[0].input.Entries;

    expect(() =>
        JSON.parse(entries?.[0].Detail || "invalid")
    ).not.toThrowError();
});

test("sends the provided URL in the entry detail", async () => {
    const expectedURLKey = "baseURL";

    await client.sentStatusUpdate(VALID_HOSTNAME, VALID_STATUS);
    const calls = mockEventBridgeClient.commandCalls(PutEventsCommand);
    const detail = JSON.parse(
        calls[0].args[0].input.Entries?.[0].Detail || "unexpected"
    );

    expect(detail[expectedURLKey]).toEqual(VALID_HOSTNAME);
});

test("sends the provided status in the entry detail", async () => {
    const expectedStatusKey = "status";

    await client.sentStatusUpdate(VALID_HOSTNAME, VALID_STATUS);
    const calls = mockEventBridgeClient.commandCalls(PutEventsCommand);
    const detail = JSON.parse(
        calls[0].args[0].input.Entries?.[0].Detail || "unexpected"
    );

    expect(detail[expectedStatusKey]).toEqual(VALID_STATUS);
});

test("returns success given event is succesfully sent", async () => {
    const response = await client.sentStatusUpdate(
        VALID_HOSTNAME,
        VALID_STATUS
    );

    expect(response).toEqual(true);
});
