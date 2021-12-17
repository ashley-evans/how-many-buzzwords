import { SQSEvent } from 'aws-lambda';
import { mock } from 'jest-mock-extended';

import { handler } from '../crawl-urls';


const mockEvent = mock<SQSEvent>();

const VALID_MAX_CRAWL_DEPTH = '1';
const VALID_MAX_REQUESTS_PER_CRAWL = '1';
const VALID_TABLE_NAME = 'test';

jest.mock('../adapters/SQSAdapter');

beforeEach(() => {
    process.env.MAX_CRAWL_DEPTH = VALID_MAX_CRAWL_DEPTH;
    process.env.MAX_REQUESTS_PER_CRAWL = VALID_MAX_REQUESTS_PER_CRAWL;
    process.env.TABLE_NAME = VALID_TABLE_NAME;
});

test.each([
    ['undefined', undefined],
    ['not a number', 'wibble']
])('throws error if max crawl depth is %s', 
    async (text: string, maxCrawlDepth?: string) => {
        process.env.MAX_CRAWL_DEPTH = maxCrawlDepth;

        await expect(handler(mockEvent)).rejects.toThrow(
            new Error('Max Crawl Depth is not a number.')
        );
    }
);

test.each([
    ['undefined', undefined],
    ['not a number', 'wibble']
])('throws error if max requests per crawl is %s', 
    async (text: string, maxRequests?: string) => {
        process.env.MAX_REQUESTS_PER_CRAWL = maxRequests;

        await expect(handler(mockEvent)).rejects.toThrow(
            new Error('Max requests per crawl is not a number.')
        );
    }
);

test('throws error if table name is undefined', async () => {
    process.env.MAX_REQUESTS_PER_CRAWL = undefined;

    await expect(handler(mockEvent)).rejects.toThrow(
        new Error('Max requests per crawl is not a number.')
    );
});
