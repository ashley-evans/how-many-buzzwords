import { mock } from 'jest-mock-extended';
import {
    Pathname,
    Repository
} from 'buzzword-aws-crawl-urls-repository-library';

import RecentCrawlDomain from '../RecentCrawlDomain';
import { RecentCrawlResponse } from '../../ports/RecentCrawlPort';

const MAX_AGE_HOURS = 1;
const VALID_URL = new URL('https://www.example.com/');

const mockRepository = mock<Repository>();
const domain = new RecentCrawlDomain(mockRepository, MAX_AGE_HOURS);

function createDate(hoursToAdd: number): Date {
    const date = new Date();
    date.setHours(date.getHours() + hoursToAdd);
    return date;
}

function createPathnameEntry(pathname: string, date: Date): Pathname {
    return {
        pathname,
        createdAt: date,
        updatedAt: date
    };
}

describe.each([
    [
        'before max age',
        createPathnameEntry(
            VALID_URL.pathname,
            createDate(MAX_AGE_HOURS * -1 - 1)
        ),
        false
    ],
    [
        'after max age',
        createPathnameEntry(
            VALID_URL.pathname,
            createDate(MAX_AGE_HOURS - 1)
        ),
        true
    ]
])(
    'given a pathname entry that is %s',
    (message: string, pathnameEntry: Pathname, expectedResult: boolean) => {
        let response: RecentCrawlResponse | undefined;

        beforeAll(async () => {
            mockRepository.getPathname.mockResolvedValue(pathnameEntry);

            response = await domain.hasCrawledRecently(VALID_URL);
        });

        test(
            'calls repository with hostname and pathname from provided URL',
            () => {
                expect(mockRepository.getPathname).toHaveBeenCalledTimes(1);
                expect(mockRepository.getPathname).toHaveBeenCalledWith(
                    VALID_URL.hostname,
                    VALID_URL.pathname
                );
            }
        );

        test('returns not crawled recently', () => {
            expect(response?.recentlyCrawled).toEqual(expectedResult);
        });

        test('returns time of the last crawl', () => {
            expect(response?.crawlTime).toEqual(pathnameEntry.createdAt);
        });

        afterAll(() => {
            jest.resetAllMocks();
        });
    }
);

describe('given no pathname entry exists', () => {
    let response: RecentCrawlResponse | undefined;

    beforeAll(async () => {
        mockRepository.getPathname.mockResolvedValue(undefined);

        response = await domain.hasCrawledRecently(VALID_URL);
    });

    test('returns undefined', () => {
        expect(response).toBeUndefined();
    });

    afterAll(() => {
        jest.resetAllMocks();
    });
});
