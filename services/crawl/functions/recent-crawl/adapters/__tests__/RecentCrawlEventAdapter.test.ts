import { mock } from 'jest-mock-extended';

import RecentCrawlEventAdapter from '../RecentCrawlEventAdapter';
import {
    RecentCrawlAdapterResponse,
    RecentCrawlEvent
} from "../../ports/RecentCrawlAdapter";
import {
    RecentCrawlPort,
    RecentCrawlResponse
} from '../../ports/RecentCrawlPort';

const VALID_URL = new URL('https://www.example.com/');

const mockPort = mock<RecentCrawlPort>();
const adapter = new RecentCrawlEventAdapter(mockPort);

function createEvent(url?: URL | string): RecentCrawlEvent {
    const event: RecentCrawlEvent = {};
    if (url) {
        event.url = url.toString();
    }

    return event;
}

test.each([
    [
        'missing url',
        createEvent()
    ],
    [
        'invalid url (numeric)',
        createEvent('1')
    ],
    [
        'invalid url',
        createEvent(`test ${VALID_URL.toString()}`)
    ]
])(
    'throws exception given %s',
    async (message: string, event: RecentCrawlEvent) => {
        expect.assertions(1);
        await expect(
            adapter.hasCrawledRecently(event)
        ).rejects.toEqual(
            expect.objectContaining({
                message: expect.stringContaining(
                    'Exception occured during event validation:'
                )
            })
        );
    }
);

describe.each([
    [
        'that has been crawled recently',
        true
    ],
    [
        'that has not been crawled recently',
        false
    ]
])(
    'given an event with a valid URL %s',
    (message: string, recentlyCrawled: boolean) => {
        const successResponse: RecentCrawlResponse = {
            recentlyCrawled,
            crawlTime: new Date()
        };

        let response: RecentCrawlAdapterResponse;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockPort.hasCrawledRecently.mockResolvedValue(successResponse);

            response = await adapter.hasCrawledRecently(
                createEvent(VALID_URL)
            );
        });

        test('calls domain with valid URL', () => {
            expect(mockPort.hasCrawledRecently).toHaveBeenCalledTimes(1);
            expect(mockPort.hasCrawledRecently).toHaveBeenCalledWith(
                VALID_URL
            );
        });

        test('returns valid URL in response', () => {
            expect(response.baseURL).toEqual(VALID_URL.toString());
        });

        test('returns whether recently crawled in response', () => {
            expect(response.recentlyCrawled).toEqual(recentlyCrawled);
        });
        
        test('returns crawl date time in response', () => {
            expect(response.crawlTime).toEqual(successResponse.crawlTime);
        });
    }
);

describe('given an event with a valid URL that has never been crawled', () => {
    let response: RecentCrawlAdapterResponse;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockPort.hasCrawledRecently.mockResolvedValue(undefined);

        response = await adapter.hasCrawledRecently(
            createEvent(VALID_URL)
        );
    });

    test('calls domain with valid URL', () => {
        expect(mockPort.hasCrawledRecently).toHaveBeenCalledTimes(1);
        expect(mockPort.hasCrawledRecently).toHaveBeenCalledWith(
            VALID_URL
        );
    });

    test('returns valid URL in response', () => {
        expect(response.baseURL).toEqual(VALID_URL.toString());
    });

    test('returns not recently crawled in response', () => {
        expect(response.recentlyCrawled).toEqual(false);
    });
    
    test('returns no crawl datetime in response', () => {
        expect(response.crawlTime).toBeUndefined();
    });
});
