import { mock } from 'jest-mock-extended';

import CrawlProvider from '../../ports/CrawlProvider';
import Repository from '../../ports/Repository';
import Crawl from '../Crawl';

const mockCrawlProvider = mock<CrawlProvider>();
const mockRepository = mock<Repository>();

const EXPECTED_BASE_URL = 'www.example.com';
const EXPECTED_PATHNAME = 'example';

beforeEach(() => {
    jest.resetAllMocks();
});

describe('crawl provides results', () => {
    it.each([
        ['https'],
        ['http']
    ])(
        'provides child url and base url to repository without %s protocol',
        async (protocol) => {
            const baseURL = new URL(`${protocol}://${EXPECTED_BASE_URL}`);
            const childURL = new URL(
                `${baseURL.toString()}${EXPECTED_PATHNAME}`
            );
    
            mockCrawlProvider.crawl.mockResolvedValue([childURL]);
            const crawler = new Crawl(mockCrawlProvider, mockRepository);
    
            await crawler.crawl(baseURL);
    
            expect(mockRepository.storePathnames).toHaveBeenCalledWith(
                EXPECTED_BASE_URL,
                [`/${EXPECTED_PATHNAME}`]
            );
        }
    );

    it('returns success if storage succeeds', async () => {
        const baseURL = new URL(`http://${EXPECTED_BASE_URL}`);
        const childURL = new URL(
            `${baseURL.toString()}${EXPECTED_PATHNAME}`
        );
    
        mockCrawlProvider.crawl.mockResolvedValue([childURL]);
        mockRepository.storePathnames.mockResolvedValue(true);
        const crawler = new Crawl(mockCrawlProvider, mockRepository);

        const response = await crawler.crawl(baseURL);

        expect(response).toBe(true);
    });
});

describe('crawl returns no results', () => {
    let response: boolean;

    beforeAll(async () => {
        const baseURL = new URL(`http://${EXPECTED_BASE_URL}`);
        mockCrawlProvider.crawl.mockResolvedValue([]);

        const crawler = new Crawl(mockCrawlProvider, mockRepository);
    
        response = await crawler.crawl(baseURL);
    });

    it('does not call repository', () => {
        expect(mockRepository.storePathnames).not.toBeCalled();
    });

    it('returns failure', () => {
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

    it('returns failure if error occurs during crawl', async () => {
        mockCrawlProvider.crawl.mockImplementation(() => {
            throw new Error();
        });
        const crawler = new Crawl(mockCrawlProvider, mockRepository);
    
        const response = await crawler.crawl(baseURL);
    
        expect(response).toBe(false);
    });

    it('returns failure if error occurs during storage', async () => {
        const childURL = new URL(
            `${baseURL.toString()}${EXPECTED_PATHNAME}`
        );

        mockCrawlProvider.crawl.mockResolvedValue([childURL]);
        mockRepository.storePathnames.mockImplementation(() => {
            throw new Error();
        });
        const crawler = new Crawl(mockCrawlProvider, mockRepository);
    
        const response = await crawler.crawl(baseURL);
    
        expect(response).toBe(false);
    });
});
