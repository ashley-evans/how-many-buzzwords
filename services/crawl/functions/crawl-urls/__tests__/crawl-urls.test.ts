import { mock } from 'jest-mock-extended';

jest.mock('buzzword-aws-crawl-urls-repository-library');

import { handler } from '../crawl-urls';
import { CrawlEvent } from '../ports/PrimaryAdapter';

const mockEvent = mock<CrawlEvent>();

const VALID_MAX_CRAWL_DEPTH = '1';
const VALID_MAX_REQUESTS_PER_CRAWL = '1';
const VALID_TABLE_NAME = 'test';

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
        if (maxCrawlDepth) {
            process.env.MAX_CRAWL_DEPTH = maxCrawlDepth;
        } else {
            delete process.env.MAX_CRAWL_DEPTH;
        }

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
        if (maxRequests) {
            process.env.MAX_REQUESTS_PER_CRAWL = maxRequests;
        } else {
            delete process.env.MAX_REQUESTS_PER_CRAWL;
        }

        await expect(handler(mockEvent)).rejects.toThrow(
            new Error('Max requests per crawl is not a number.')
        );
    }
);

test('throws error if table name is undefined', async () => {
    delete process.env.TABLE_NAME;

    await expect(handler(mockEvent)).rejects.toThrow(
        new Error('URLs Table Name has not been set.')
    );
});
