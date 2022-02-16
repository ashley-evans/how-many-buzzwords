import { mock } from 'jest-mock-extended';
import { EMPTY, of, throwError, concat } from 'rxjs';
import { Repository } from 'buzzword-aws-crawl-urls-repository-library';

import { CrawlerResponse } from '../../ports/CrawlPort';
import { CrawlProvider, CrawlResult } from '../../ports/CrawlProvider';
import Crawl from '../Crawl';

const mockCrawlProvider = mock<CrawlProvider>();
const mockRepository = mock<Repository>();
const crawler = new Crawl(mockCrawlProvider, mockRepository);

const EXPECTED_BASE_URL_HOSTNAME = 'www.example.com';
const DEFAULT_BASE_URL = new URL(`http://${EXPECTED_BASE_URL_HOSTNAME}`);
const EXPECTED_PATHNAME = 'example';
const DEFAULT_CHILD_URL = new URL(
    `${DEFAULT_BASE_URL.toString()}${EXPECTED_PATHNAME}`
);

function createCrawlerResult(url: URL, content?: string): CrawlResult {
    return {
        url,
        content: content ? content : ''
    };
}

describe('crawl provides results', () => {
    describe.each([
        'http',
        'https'
    ])('handles %s URLs', (protocol) => {
        const baseURL = new URL(`${protocol}://${EXPECTED_BASE_URL_HOSTNAME}`);

        beforeAll(async () => {
            const childURL = new URL(
                `${baseURL.toString()}${EXPECTED_PATHNAME}`
            );
    
            const source = of(createCrawlerResult(childURL));
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);
    
            await crawler.crawl(baseURL);
        });

        test('calls crawl provider with URL', () => {
            expect(mockCrawlProvider.crawl).toHaveBeenCalledWith(
                baseURL,
                undefined
            );
        });

        test(
            'provides child pathname and url to repository without %s protocol',
            () => {
                expect(mockRepository.storePathname).toHaveBeenCalledTimes(1);
                expect(mockRepository.storePathname).toHaveBeenCalledWith(
                    EXPECTED_BASE_URL_HOSTNAME,
                    `/${EXPECTED_PATHNAME}`
                );
            }
        );

        afterAll(() => {
            jest.resetAllMocks();
        });
    });

    test(
        'provides multiple urls to repository given multiple results',
        async () => {
            const childURL2 = new URL(
                `${DEFAULT_BASE_URL.toString()}example2`
            );
            
            const source = of(
                createCrawlerResult(DEFAULT_CHILD_URL),
                createCrawlerResult(childURL2)
            );
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);
    
            await crawler.crawl(DEFAULT_BASE_URL);
    
            expect(mockRepository.storePathname).toHaveBeenCalledTimes(2);
        }
    );

    describe('returns valid crawler response', () => {
        let response: CrawlerResponse;

        beforeAll(async () => {
            const source = of(
                createCrawlerResult(DEFAULT_CHILD_URL)
            );
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);
    
            response = await crawler.crawl(DEFAULT_BASE_URL);
        });

        test('returns success if storage succeeds', () => {
            expect(response.success).toBe(true);
        });
    
        test('returns child url pathname if storage succeeds', () => {
            expect(response.pathnames).toHaveLength(1);
            expect(response.pathnames).toContainEqual(
                DEFAULT_CHILD_URL.pathname
            );
        });
    });

});

describe('crawl returns no results', () => {
    let response: CrawlerResponse;

    beforeAll(async () => {
        jest.resetAllMocks();

        const source = EMPTY;
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockRepository.storePathname.mockResolvedValue(true);
    
        response = await crawler.crawl(DEFAULT_BASE_URL);
    });

    test('does not call repository', () => {
        expect(mockRepository.storePathname).not.toBeCalled();
    });

    test('returns failure', () => {
        expect(response.success).toBe(false);
    });

    test('returns no pathnames', () => {
        expect(response.pathnames).toHaveLength(0);
    });
});

describe('optional max depth parameter', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test(
        'provides optional max crawl depth to crawl provider if provided',
        async () => {
            const expectedMaxCrawlDepth = 50;

            const source = EMPTY;
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);

            await crawler.crawl(DEFAULT_BASE_URL, expectedMaxCrawlDepth);

            expect(mockCrawlProvider.crawl).toHaveBeenCalledWith(
                DEFAULT_BASE_URL,
                expectedMaxCrawlDepth
            );
        }
    );
});

describe('Error handling', () => {
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {
            return undefined;
        });
    });

    describe('error occurs during crawl', () => {
        let response: CrawlerResponse;

        beforeAll(async () => {
            jest.resetAllMocks();

            const source = throwError(() => new Error());
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);
        
            response = await crawler.crawl(DEFAULT_BASE_URL);
        });

        test('returns failure', () => {
            expect(response.success).toBe(false);
        });

        test('returns no pathnames', () => {
            expect(response.pathnames).toHaveLength(0);
        });
    });

    describe('error occurs during storage', () => {
        let response: CrawlerResponse;

        beforeAll(async () => {
            jest.resetAllMocks();

            const source = of(
                createCrawlerResult(DEFAULT_CHILD_URL)
            );
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockImplementation(() => {
                throw new Error();
            });
        
            response = await crawler.crawl(DEFAULT_BASE_URL);
        });

        test('returns failure', () => {
            expect(response.success).toBe(false);
        });

        test('returns no pathnames', () => {
            expect(response.pathnames).toHaveLength(0);
        });
    });

    describe('error occurs after successful crawls', () => {
        let response: CrawlerResponse;

        beforeAll(async () => {
            jest.resetAllMocks();

            const source = concat(
                of(
                    createCrawlerResult(DEFAULT_CHILD_URL)
                ),
                throwError(() => new Error())
            );
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);

            response = await crawler.crawl(DEFAULT_BASE_URL);
        });

        test('returns failure', () => {
            expect(response.success).toBe(false);
        });

        test('returns pathnames crawled so far', () => {
            expect(response.pathnames).toHaveLength(1);
            expect(response.pathnames).toContainEqual(
                DEFAULT_CHILD_URL.pathname
            );
        });

        test('provides successful crawl results to repository', () => {
            expect(mockRepository.storePathname).toHaveBeenCalledWith(
                EXPECTED_BASE_URL_HOSTNAME,
                `/${EXPECTED_PATHNAME}`
            );
        });
    });
});
