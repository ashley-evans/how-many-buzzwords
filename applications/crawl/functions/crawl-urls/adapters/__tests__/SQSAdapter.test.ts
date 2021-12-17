import { SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import { mock } from 'jest-mock-extended';

import CrawlPort from "../../ports/CrawlPort";
import SNSAdapter from "../SQSAdapter";

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

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe.each([
    [
        'empty body', 
        createEvent(
            createRecord('')
        )
    ],
    [
        'missing url',
        createEvent(
            createRecord(JSON.stringify({
                depth: 10
            }))
        )
    ],
    [
        'invalid url (numeric)', 
        createEvent(
            createRecord(JSON.stringify({
                url: 1
            }))
        )
    ],
    [
        'invalid url',
        createEvent(
            createRecord(JSON.stringify({
                url: `test ${EXPECTED_VALID_URL}`
            }))
        )
    ],
    [
        'invalid depth (non-integer)',
        createEvent(
            createRecord(EXPECTED_VALID_URL, 3.14)
        )
    ],
    [
        'invalid depth (string)',
        createEvent(
            createRecord(JSON.stringify({
                url: EXPECTED_VALID_URL,
                depth: 'test'
            }))
        )
    ]
])('handles invalid event body with %s', (text: string, event: SQSEvent) => {
    let response: SQSBatchResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

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
});

describe.each([
    [
        'a single valid URL',
        [
            EXPECTED_VALID_URL
        ]
    ],
    [
        'multiple valid URLs',
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

describe.each([
    [
        'a single url',
        [1]
    ],
    [
        'multiple urls',
        [1, 2]
    ]
])(
    'handles specified depth for %s',
    (text: string, depths: number[]) => {
        let response: SQSBatchResponse;

        beforeAll(async () => {
            jest.resetAllMocks();
    
            const records = depths.map(
                depth => createRecord(EXPECTED_VALID_URL, depth)
            );
            const event = createEvent(...records);
    
            const adapter = new SNSAdapter(mockCrawlPort);
    
            response = await adapter.crawl(event);
        });
    
        test('calls crawl port with depth(s) specified', async () => {
            expect(mockCrawlPort.crawl).toHaveBeenCalledTimes(depths.length);
    
            for (const depth of depths) {
                expect(mockCrawlPort.crawl).toHaveBeenCalledWith(
                    expect.anything(),
                    depth
                );
            }
        });
    
        test('returns no failures if crawl succeeds', async () => {
            expect(response).toBeDefined();
            expect(response.batchItemFailures).toHaveLength(0);
        });
    }
);
