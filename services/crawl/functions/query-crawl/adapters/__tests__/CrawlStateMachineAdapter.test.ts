import { mock } from "jest-mock-extended";
import { mockClient } from "aws-sdk-client-mock";
import {
    DescribeExecutionCommand,
    DescribeExecutionCommandOutput,
    ExecutionListItem,
    ExecutionStatus,
    ListExecutionsCommand,
    ListExecutionsCommandOutput,
    SFNClient,
} from "@aws-sdk/client-sfn";

import {
    CrawlStateMachineAdapter,
    ValidCrawlExecutionInput,
} from "../CrawlStateMachineAdapter";
import Crawl from "../../types/Crawl";

const mockSFNClient = mockClient(SFNClient);
const expectedStateMachineARN = "test_state_machine_arn";
const VALID_LIMIT = 5;
const VALID_URL = new URL("https://www.example.com/");

const adapter = new CrawlStateMachineAdapter(expectedStateMachineARN);

function createExecutionListItem(arn: string): ExecutionListItem {
    const item = mock<ExecutionListItem>();
    item.executionArn = arn;
    return item;
}

function createExecutionsListResponse(
    executions?: ExecutionListItem[]
): ListExecutionsCommandOutput {
    const output = mock<ListExecutionsCommandOutput>();
    output.executions = executions;
    return output;
}

function createDescribeExecutionResponse(
    input?: string | ValidCrawlExecutionInput,
    startDate?: Date
): DescribeExecutionCommandOutput {
    const response = mock<DescribeExecutionCommandOutput>();
    const jsonInput =
        input && typeof input !== "string" ? JSON.stringify(input) : input;
    response.input = jsonInput;
    response.startDate = startDate;
    return response;
}

beforeAll(() => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

beforeEach(() => {
    mockSFNClient.reset();

    mockSFNClient
        .on(ListExecutionsCommand)
        .resolves(createExecutionsListResponse([]));
});

test("calls client to list all crawl executions", async () => {
    await adapter.queryCrawl(VALID_LIMIT);

    const calls = mockSFNClient.commandCalls(ListExecutionsCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toHaveLength(1);
});

test("gets the crawl executions from configured state machine", async () => {
    await adapter.queryCrawl(VALID_LIMIT);

    const calls = mockSFNClient.commandCalls(ListExecutionsCommand);
    const input = calls[0].args[0].input;
    expect(input).toEqual(
        expect.objectContaining({
            stateMachineArn: expectedStateMachineARN,
        })
    );
});

test("provides configured limit to crawl executions query", async () => {
    await adapter.queryCrawl(VALID_LIMIT);

    const calls = mockSFNClient.commandCalls(ListExecutionsCommand);
    const input = calls[0].args[0].input;
    expect(input).toEqual(
        expect.objectContaining({
            maxResults: VALID_LIMIT,
        })
    );
});

test("only requests successful crawl executions", async () => {
    await adapter.queryCrawl(VALID_LIMIT);

    const calls = mockSFNClient.commandCalls(ListExecutionsCommand);
    const input = calls[0].args[0].input;
    expect(input).toEqual(
        expect.objectContaining({
            statusFilter: ExecutionStatus.SUCCEEDED,
        })
    );
});

test.each([
    ["no", undefined],
    ["an empty list of", []],
])(
    "returns empty array if %s crawl executions are returned",
    async (message: string, executions?: ExecutionListItem[]) => {
        const mockResponse = createExecutionsListResponse(executions);
        mockSFNClient.on(ListExecutionsCommand).resolves(mockResponse);

        const actual = await adapter.queryCrawl(VALID_LIMIT);

        expect(actual).toEqual([]);
    }
);

test("throws an error if an unhandled exception occurs while getting fetching crawl executions", async () => {
    const expectedError = new Error("Test Error");
    mockSFNClient.on(ListExecutionsCommand).rejects(expectedError);

    expect.assertions(1);
    await expect(() => adapter.queryCrawl(VALID_LIMIT)).rejects.toThrow(
        expectedError
    );
});

test("calls client to get crawl execution detail for each returned execution", async () => {
    const expectedARNs = ["test_arn_1", "test_arn_2"];
    const mockResponse = createExecutionsListResponse(
        expectedARNs.map((arn) => createExecutionListItem(arn))
    );
    mockSFNClient.on(ListExecutionsCommand).resolves(mockResponse);

    await adapter.queryCrawl(VALID_LIMIT);
    const calls = mockSFNClient.commandCalls(DescribeExecutionCommand);
    const inputs = calls.map((call) => call.args[0].input);

    expect(inputs).toHaveLength(expectedARNs.length);
    for (const expected of expectedARNs) {
        expect(inputs).toContainEqual({ executionArn: expected });
    }
});

test.each([
    ["has a protocol (https)", VALID_URL.toString(), VALID_URL],
    [
        "has a protocol (http)",
        `http://${VALID_URL.hostname}`,
        new URL(`http://${VALID_URL.hostname}`),
    ],
    ["has no protocol", VALID_URL.hostname, VALID_URL],
])(
    "returns crawled URLs given URL that %s",
    async (message: string, returned: string, expected: URL) => {
        const arn = "test_arn";
        mockSFNClient
            .on(ListExecutionsCommand)
            .resolves(
                createExecutionsListResponse([createExecutionListItem(arn)])
            );
        const expectedResult: Crawl = {
            baseURL: expected,
            crawledAt: new Date(),
        };
        mockSFNClient
            .on(DescribeExecutionCommand, { executionArn: arn })
            .resolves(
                createDescribeExecutionResponse(
                    { url: returned },
                    expectedResult.crawledAt
                )
            );

        const actual = await adapter.queryCrawl(VALID_LIMIT);

        expect(actual).toEqual([expectedResult]);
    }
);

test("returns multiple crawled URLs and times if returned", async () => {
    const expectedCrawlInformation: Crawl[] = [
        { baseURL: VALID_URL, crawledAt: new Date() },
        { baseURL: new URL("https://www.test.com/"), crawledAt: new Date() },
    ];
    const executionARNs = ["arn_1", "arn_2"];
    mockSFNClient
        .on(ListExecutionsCommand)
        .resolves(
            createExecutionsListResponse(
                executionARNs.map((arn) => createExecutionListItem(arn))
            )
        );
    for (let i = 0; i < expectedCrawlInformation.length; i++) {
        mockSFNClient
            .on(DescribeExecutionCommand, { executionArn: executionARNs[i] })
            .resolves(
                createDescribeExecutionResponse(
                    { url: expectedCrawlInformation[i].baseURL.hostname },
                    expectedCrawlInformation[i].crawledAt
                )
            );
    }

    const actual = await adapter.queryCrawl(VALID_LIMIT);

    expect(actual).toEqual(expectedCrawlInformation);
});

test("only returns crawl details for executions whose details are known", async () => {
    const expectedCrawlInformation: Crawl = {
        baseURL: VALID_URL,
        crawledAt: new Date(),
    };
    const expectedARN = "expected_arn";
    const unexpectedARN = "unexpected_arn";
    mockSFNClient
        .on(ListExecutionsCommand)
        .resolves(
            createExecutionsListResponse([
                createExecutionListItem(expectedARN),
                createExecutionListItem(unexpectedARN),
            ])
        );
    mockSFNClient
        .on(DescribeExecutionCommand, { executionArn: expectedARN })
        .resolves(
            createDescribeExecutionResponse(
                { url: expectedCrawlInformation.baseURL.hostname },
                expectedCrawlInformation.crawledAt
            )
        );
    mockSFNClient
        .on(DescribeExecutionCommand, { executionArn: unexpectedARN })
        .resolves(createDescribeExecutionResponse());

    const actual = await adapter.queryCrawl(VALID_LIMIT);

    expect(actual).toEqual([expectedCrawlInformation]);
});

test.each([
    ["input", undefined, new Date()],
    ["start date", { url: VALID_URL.toString() }, undefined],
])(
    "returns empty array if %s for execution is undefined",
    async (
        message: string,
        input?: ValidCrawlExecutionInput,
        startDate?: Date
    ) => {
        const expectedARN = "arn_1";
        mockSFNClient
            .on(ListExecutionsCommand)
            .resolves(
                createExecutionsListResponse([createExecutionListItem("arn_1")])
            );
        mockSFNClient
            .on(DescribeExecutionCommand, { executionArn: expectedARN })
            .resolves(createDescribeExecutionResponse(input, startDate));

        const actual = await adapter.queryCrawl(VALID_LIMIT);

        expect(actual).toEqual([]);
    }
);

test("throws an error if an unhandled exception occurs while obtaining execution details", async () => {
    const expectedError = new Error("Test error");
    const errorARN = "test_error_arn";
    mockSFNClient
        .on(ListExecutionsCommand)
        .resolves(
            createExecutionsListResponse([createExecutionListItem(errorARN)])
        );
    mockSFNClient
        .on(DescribeExecutionCommand, { executionArn: errorARN })
        .rejects(expectedError);

    expect.assertions(1);
    await expect(() => adapter.queryCrawl(VALID_LIMIT)).rejects.toThrow(
        expectedError
    );
});
