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

function createRecord(url: URL, depth?: number): SQSRecord {
    const record = mock<SQSRecord>();

    record.body = createEventBody(url, depth);

    return record;
}

function createEventBody(url: URL, depth?: number): string {
    return JSON.stringify({
        url: url.toString(),
        depth,
    });
}

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
