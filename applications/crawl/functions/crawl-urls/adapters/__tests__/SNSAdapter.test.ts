import { SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import { mock } from 'jest-mock-extended';

import CrawlPort from "../../ports/CrawlPort";
import SNSAdapter from "../SNSAdapter";

const mockCrawlPort = mock<CrawlPort>();

const EXPECTED_VALID_URL = new URL('http://www.example.com');

function createEvent(...records: SQSRecord[]): SQSEvent {
    return {
        Records: records
    };
}

function createRecord(url: URL | string, depth?: number): SQSRecord {
    const record = mock<SQSRecord>();

    if (url instanceof URL) {
        record.body = createEventBody(url, depth);
    } else {
        record.body = url;
    }

    return record;
}

function createEventBody(url: URL, depth?: number): string {
    return JSON.stringify({
        url: url.toString(),
        depth,
    });
}

describe.each([
    ['empty body', createEvent(createRecord(''))]
])('handles invalid event body with %s', (text: string, event: SQSEvent) => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    let response: SQSBatchResponse;

    beforeAll(async () => {
        jest.resetAllMocks();
        consoleErrorSpy.mockImplementation(() => undefined);

        const adapter = new SNSAdapter(mockCrawlPort);

        response = await adapter.crawl(event);
    });

    test('does not call crawl port', async () => {
        expect(mockCrawlPort.crawl).toHaveBeenCalledTimes(0);
    });

    test('returns no failures', async () => {
        expect(response).toBeDefined();
        expect(response.batchItemFailures).toHaveLength(0);
    });

    afterAll(() => {
        consoleErrorSpy.mockRestore();
    });
});

describe.each([
    [
        'a single URL',
        [
            EXPECTED_VALID_URL
        ]
    ],
    [
        'multiple URLs',
        [
            EXPECTED_VALID_URL,
            new URL(`${EXPECTED_VALID_URL.origin}/example`)
        ]
    ]
])('handles %s', (text: string, urls: URL[]) => {
    let response: SQSBatchResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        const records = urls.map(url => createRecord(url));
        const event = createEvent(...records);

        const adapter = new SNSAdapter(mockCrawlPort);

        response = await adapter.crawl(event);
    });

    test('calls crawl port with all URLs from event', async () => {
        expect(mockCrawlPort.crawl).toHaveBeenCalledTimes(urls.length);

        for (const url of urls) {
            expect(mockCrawlPort.crawl).toHaveBeenCalledWith(
                url,
                undefined
            );
        }
    });

    test('returns no failures if crawl succeeds', async () => {
        expect(response).toBeDefined();
        expect(response.batchItemFailures).toHaveLength(0);
    });
});
