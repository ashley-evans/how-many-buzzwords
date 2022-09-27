import { mock } from "jest-mock-extended";
import { AppSyncResolverEvent } from "aws-lambda";

import { QueryKeyphrasesPort } from "../../ports/QueryKeyphrasesPort";
import QueryKeyphrasesAppSyncAdapter from "../QueryKeyphrasesAppSyncAdapter";
import { QueryKeyphrasesArgs } from "../../../../schemas/schema";

const VALID_BASE_URL = "www.example.com";
const VALID_EVENT = createEvent(VALID_BASE_URL);

const mockPort = mock<QueryKeyphrasesPort>();
const adapter = new QueryKeyphrasesAppSyncAdapter(mockPort);

function createEvent(
    baseURL: string
): AppSyncResolverEvent<QueryKeyphrasesArgs> {
    const event = mock<AppSyncResolverEvent<QueryKeyphrasesArgs>>();
    event.arguments = {
        baseURL: baseURL,
    };

    return event;
}

beforeEach(() => {
    mockPort.queryKeyphrases.mockReset();
});

test("calls the port with the provided base URL", async () => {
    await adapter.handleQuery(VALID_EVENT);

    expect(mockPort.queryKeyphrases).toHaveBeenCalledTimes(1);
    expect(mockPort.queryKeyphrases).toHaveBeenCalledWith(VALID_BASE_URL);
});

test("returns empty array if no keyphrases returned", async () => {
    const actual = await adapter.handleQuery(VALID_EVENT);

    expect(actual).toEqual([]);
});
