import { mock } from 'jest-mock-extended';

import CrawlPort from "../../ports/CrawlPort";
import { CrawlEvent, CrawlResponse } from '../../ports/PrimaryAdapter';
import SNSAdapter from "../EventAdapter";

const mockCrawlPort = mock<CrawlPort>();

const EXPECTED_VALID_URL = new URL('http://www.example.com');

function createEvent(url?: URL | string, depth?: number | string): CrawlEvent {
    const event: CrawlEvent = {};
    if (url) {
        event.url = url.toString();
    }

    if (depth) {
        event.depth = depth.toString();
    }

    return event;
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe.each([
    [
        'missing url',
        createEvent(undefined, 10)
    ],
    [
        'invalid url (numeric)', 
        createEvent('1')
    ],
    [
        'invalid url',
        createEvent(`test ${EXPECTED_VALID_URL}`)
    ],
    [
        'invalid depth (non-integer)',
        createEvent(EXPECTED_VALID_URL, 3.14)
    ],
    [
        'invalid depth (string)',
        createEvent(EXPECTED_VALID_URL, 'test')
    ]
])('handles invalid event body with %s', (text: string, event: CrawlEvent) => {
    let response: CrawlResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        const adapter = new SNSAdapter(mockCrawlPort);

        response = await adapter.crawl(event);
    });

    test('does not call crawl port', async () => {
        expect(mockCrawlPort.crawl).toHaveBeenCalledTimes(0);
    });

    test('returns provided URL in response', () => {
        expect(response).toBeDefined();
        expect(response.baseURL).toEqual(event.url);
    });

    test('returns failure', () => {
        expect(response).toBeDefined();
        expect(response.success).toEqual(false);
    });
});

describe('handles a single valid URL', () => {
    let response: CrawlResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        const event = createEvent(EXPECTED_VALID_URL);

        mockCrawlPort.crawl.mockResolvedValue(true);
        const adapter = new SNSAdapter(mockCrawlPort);

        response = await adapter.crawl(event);
    });

    test('calls crawl port with URL from event', () => {
        expect(mockCrawlPort.crawl).toHaveBeenCalledTimes(1);
        expect(mockCrawlPort.crawl).toHaveBeenCalledWith(
            EXPECTED_VALID_URL,
            undefined
        );
    });

    test('returns base URL in response given crawl succeeds', () => {
        expect(response).toBeDefined();
        expect(response.baseURL).toEqual(EXPECTED_VALID_URL);
    });

    test('returns success given crawl succeeds', () => {
        expect(response).toBeDefined();
        expect(response.success).toEqual(true);
    });
});

describe('handles a single valid URL up to specified depth', () => {
    const expectedDepth = 10;

    let response: CrawlResponse;

    beforeAll(async () => {
        jest.resetAllMocks();
    
        const event = createEvent(EXPECTED_VALID_URL, expectedDepth);

        mockCrawlPort.crawl.mockResolvedValue(true);
        const adapter = new SNSAdapter(mockCrawlPort);
    
        response = await adapter.crawl(event);
    });
    
    test('calls crawl port with depth specified', () => {
        expect(mockCrawlPort.crawl).toHaveBeenCalledTimes(1);
        expect(mockCrawlPort.crawl).toHaveBeenCalledWith(
            expect.anything(),
            expectedDepth
        );
    });

    test('returns base URL in response given crawl succeeds', () => {
        expect(response).toBeDefined();
        expect(response.baseURL).toEqual(EXPECTED_VALID_URL);
    });

    test('returns success given crawl succeeds', () => {
        expect(response).toBeDefined();
        expect(response.success).toEqual(true);
    });
});

describe('error handling', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('throws crawl error if error occurs during crawl', async () => {
        const event = createEvent(EXPECTED_VALID_URL);
        mockCrawlPort.crawl.mockRejectedValue(new Error());
    
        const adapter = new SNSAdapter(mockCrawlPort);
        
        expect.assertions(1);
        await expect(adapter.crawl(event)).rejects.toEqual(
            expect.objectContaining({
                name: 'CrawlError'
            })
        );
    });



    test('returns crawl error if crawl returns failure', async () => {
        const event = createEvent(EXPECTED_VALID_URL);
        mockCrawlPort.crawl.mockResolvedValue(false);
    
        const adapter = new SNSAdapter(mockCrawlPort);
    
        expect.assertions(1);
        await expect(adapter.crawl(event)).rejects.toEqual(
            expect.objectContaining({
                name: 'CrawlError'
            })
        );
    });    
});
