import { mock } from 'jest-mock-extended';
import { EMPTY, of, throwError, concat } from 'rxjs';

import CrawlProvider from '../../ports/CrawlProvider';
import Repository from '../../ports/Repository';
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
    
            const source = of(childURL);
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
            
            const source = of(DEFAULT_CHILD_URL, childURL2);
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);
    
            await crawler.crawl(DEFAULT_BASE_URL);
    
            expect(mockRepository.storePathname).toHaveBeenCalledTimes(2);
        }
    );

    test('returns success if storage succeeds', async () => {
        const source = of(DEFAULT_CHILD_URL);
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockRepository.storePathname.mockResolvedValue(true);

        const response = await crawler.crawl(DEFAULT_BASE_URL);

        expect(response).toBe(true);
    });
});

describe('crawl returns no results', () => {
    let response: boolean;

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
        expect(response).toBe(false);
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

    test('returns failure if error occurs during crawl', async () => {
        const source = throwError(() => new Error());
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockRepository.storePathname.mockResolvedValue(true);
    
        const response = await crawler.crawl(DEFAULT_BASE_URL);
    
        expect(response).toBe(false);
    });

    test('returns failure if error occurs during storage', async () => {
        const source = of(DEFAULT_CHILD_URL);
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockRepository.storePathname.mockRejectedValue(new Error());
    
        const response = await crawler.crawl(DEFAULT_BASE_URL);
    
        expect(response).toBe(false);
    });

    describe('error occurs after successful crawls', () => {
        let response: boolean;

        beforeAll(async () => {
            jest.resetAllMocks();

            const source = concat(
                of(DEFAULT_CHILD_URL),
                throwError(() => new Error())
            );
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);

            response = await crawler.crawl(DEFAULT_BASE_URL);
        });

        test('returns failure', () => {
            expect(response).toBe(false);
        });

        test('provides successful crawl results to repository', () => {
            expect(mockRepository.storePathname).toHaveBeenCalledWith(
                EXPECTED_BASE_URL_HOSTNAME,
                `/${EXPECTED_PATHNAME}`
            );
        });
    });
});
