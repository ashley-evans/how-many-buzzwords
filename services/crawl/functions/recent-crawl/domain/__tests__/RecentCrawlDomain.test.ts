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

describe('given a pathname entry that is older than max age', () => {
    let response: RecentCrawlResponse | undefined;
    let expectedDate: Date;

    beforeAll(async () => {
        expectedDate = new Date();
        expectedDate.setHours(expectedDate.getHours() - (MAX_AGE_HOURS + 1));
        const mockPathnameResponse: Pathname = {
            pathname: VALID_URL.pathname,
            createdAt: expectedDate,
            updatedAt: expectedDate
        };

        mockRepository.getPathname.mockResolvedValue(mockPathnameResponse);

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
        expect(response?.recentlyCrawled).toEqual(false);
    });

    test('returns time of the last crawl', () => {
        expect(response?.crawlTime).toEqual(expectedDate);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });
});
