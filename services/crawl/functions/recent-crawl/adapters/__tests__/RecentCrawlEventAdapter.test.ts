import { mock } from 'jest-mock-extended';

import RecentCrawlEventAdapter from '../RecentCrawlEventAdapter';
import RecentCrawlDomain from '../../domain/RecentCrawlDomain';
import { RecentCrawlEvent } from "../../ports/RecentCrawlAdapter";

const VALID_URL = new URL('https://www.example.com/');

const mockDomain = mock<RecentCrawlDomain>();
const adapter = new RecentCrawlEventAdapter(mockDomain);

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

describe('given an event with a valid URL', () => {
    beforeAll(async () => {
        jest.resetAllMocks();

        await adapter.hasCrawledRecently(
            createEvent(VALID_URL)
        );
    });

    test('calls domain with valid URL', () => {
        expect(mockDomain.hasCrawledRecently).toHaveBeenCalledTimes(1);
        expect(mockDomain.hasCrawledRecently).toHaveBeenCalledWith(
            VALID_URL
        );
    });
});
