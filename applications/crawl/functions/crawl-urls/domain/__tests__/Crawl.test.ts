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
        (protocol) => {
            const baseURL = new URL(`${protocol}://${EXPECTED_BASE_URL}`);
            const childURL = new URL(
                `${baseURL.toString()}${EXPECTED_PATHNAME}`
            );
    
            mockCrawlProvider.crawl.mockReturnValue([childURL]);
            const crawler = new Crawl(mockCrawlProvider, mockRepository);
    
            crawler.crawl(baseURL);
    
            expect(mockRepository.storePathnames).toHaveBeenCalledWith(
                EXPECTED_BASE_URL,
                [`/${EXPECTED_PATHNAME}`]
            );
        }
    );

    it('returns success if storage succeeds', () => {
        const baseURL = new URL(`http://${EXPECTED_BASE_URL}`);
        const childURL = new URL(
            `${baseURL.toString()}${EXPECTED_PATHNAME}`
        );
    
        mockCrawlProvider.crawl.mockReturnValue([childURL]);
        mockRepository.storePathnames.mockReturnValue(true);
        const crawler = new Crawl(mockCrawlProvider, mockRepository);

        const response = crawler.crawl(baseURL);

        expect(response).toBe(true);
    });
});

describe('crawl returns no results', () => {
    let response: boolean;

    beforeAll(() => {
        const baseURL = new URL(`http://${EXPECTED_BASE_URL}`);
        mockCrawlProvider.crawl.mockReturnValue([]);

        const crawler = new Crawl(mockCrawlProvider, mockRepository);
    
        response = crawler.crawl(baseURL);
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

    it('returns failure if error occurs during crawl', () => {
        mockCrawlProvider.crawl.mockImplementation(() => {
            throw new Error();
        });
        const crawler = new Crawl(mockCrawlProvider, mockRepository);
    
        const response = crawler.crawl(baseURL);
    
        expect(response).toBe(false);
    });

    it('returns failure if error occurs during storage', () => {
        const childURL = new URL(
            `${baseURL.toString()}${EXPECTED_PATHNAME}`
        );

        mockCrawlProvider.crawl.mockReturnValue([childURL]);
        mockRepository.storePathnames.mockImplementation(() => {
            throw new Error();
        });
        const crawler = new Crawl(mockCrawlProvider, mockRepository);
    
        const response = crawler.crawl(baseURL);
    
        expect(response).toBe(false);
    });
});
