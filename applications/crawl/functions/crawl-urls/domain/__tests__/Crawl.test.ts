import { mock } from 'jest-mock-extended';
import { EMPTY, of, throwError, concat } from 'rxjs';

import CrawlProvider from '../../ports/CrawlProvider';
import Repository from '../../ports/Repository';
import Crawl from '../Crawl';

const mockCrawlProvider = mock<CrawlProvider>();
const mockRepository = mock<Repository>();
const crawler = new Crawl(mockCrawlProvider, mockRepository);


const EXPECTED_BASE_URL = 'www.example.com';
const EXPECTED_PATHNAME = 'example';

describe('crawl provides results', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test.each([
        ['https'],
        ['http']
    ])(
        'provides child pathname and url to repository without %s protocol',
        async (protocol) => {
            const baseURL = new URL(`${protocol}://${EXPECTED_BASE_URL}`);
            const childURL = new URL(
                `${baseURL.toString()}${EXPECTED_PATHNAME}`
            );
    
            const source = of(childURL);
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);
    
            await crawler.crawl(baseURL);

            expect(mockRepository.storePathname).toHaveBeenCalledTimes(1);
            expect(mockRepository.storePathname).toHaveBeenCalledWith(
                EXPECTED_BASE_URL,
                `/${EXPECTED_PATHNAME}`
            );
        }
    );

    test(
        'provides multiple urls to repository given multiple results',
        async () => {
            const baseURL = new URL(`http://${EXPECTED_BASE_URL}`);
            const childURL1 = new URL(
                `${baseURL.toString()}${EXPECTED_PATHNAME}`
            );
            const childURL2 = new URL(
                `${baseURL.toString()}/example2`
            );
            
            const source = of(childURL1, childURL2);
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);
    
            await crawler.crawl(baseURL);
    
            expect(mockRepository.storePathname).toHaveBeenCalledTimes(2);
        }
    );

    test('returns success if storage succeeds', async () => {
        const baseURL = new URL(`http://${EXPECTED_BASE_URL}`);
        const childURL = new URL(
            `${baseURL.toString()}${EXPECTED_PATHNAME}`
        );

        const source = of(childURL);
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockRepository.storePathname.mockResolvedValue(true);

        const response = await crawler.crawl(baseURL);

        expect(response).toBe(true);
    });
});

describe('crawl returns no results', () => {
    let response: boolean;

    beforeAll(async () => {
        jest.resetAllMocks();

        const baseURL = new URL(`http://${EXPECTED_BASE_URL}`);

        const source = EMPTY;
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockRepository.storePathname.mockResolvedValue(true);
    
        response = await crawler.crawl(baseURL);
    });

    test('does not call repository', () => {
        expect(mockRepository.storePathname).not.toBeCalled();
    });

    test('returns failure', () => {
        expect(response).toBe(false);
    });
});


describe('Error handling', () => {
    const baseURL = new URL(`http://${EXPECTED_BASE_URL}`);

    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {
            return undefined;
        });
    });

    test('returns failure if error occurs during crawl', async () => {
        const source = throwError(() => new Error());
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockRepository.storePathname.mockResolvedValue(true);
    
        const response = await crawler.crawl(baseURL);
    
        expect(response).toBe(false);
    });

    test('returns failure if error occurs during storage', async () => {
        const childURL = new URL(
            `${baseURL.toString()}${EXPECTED_PATHNAME}`
        );

        const source = of(childURL);
        mockCrawlProvider.crawl.mockReturnValue(source);
        mockRepository.storePathname.mockRejectedValue(new Error());
    
        const response = await crawler.crawl(baseURL);
    
        expect(response).toBe(false);
    });

    describe('error occurs after successful crawls', () => {
        const childURL = new URL(
            `${baseURL.toString()}${EXPECTED_PATHNAME}`
        );
        let response: boolean;

        beforeAll(async () => {
            jest.resetAllMocks();

            const source = concat(of(childURL), throwError(() => new Error()));
            mockCrawlProvider.crawl.mockReturnValue(source);
            mockRepository.storePathname.mockResolvedValue(true);

            response = await crawler.crawl(baseURL);
        });

        test('returns failure', () => {
            expect(response).toBe(false);
        });

        test('provides successful crawl results to repository', () => {
            expect(mockRepository.storePathname).toHaveBeenCalledWith(
                EXPECTED_BASE_URL,
                `/${EXPECTED_PATHNAME}`
            );
        });
    });
});
