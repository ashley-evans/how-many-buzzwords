import path from 'path';
import { Observable } from 'rxjs';
import nock from 'nock';
import { Scope } from 'nock/types';

import { init, clean, destroy } from './helpers/local-storage-emulator';
import { mockURLFromFile } from '../../../../../../helpers/http-mock';

import ApifyProvider from '../ApifyProvider';

const ENTRY_POINT_URL = new URL('http://www.example.com');

const LOCAL_STORAGE_DIR = path.join(__dirname, '/apify_storage');
const ASSET_FOLDER = path.join(__dirname, '/assets/');
const DEPTH_FOLDER = path.join(ASSET_FOLDER, '/depth');
const DEPTH_PATH_PREFIX = '/depth-';

const MAX_CRAWL_DEPTH = 3;

function receiveObservableOutput<T>(observable: Observable<T>): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const results: T[] = [];
        observable.subscribe({
            next: (value) => results.push(value),
            complete: () => resolve(results),
            error: (ex) => reject(ex) 
        });
    });
}

function mockDepthURLs(depth: number): Scope[] {
    const mocks: Scope[] = [];
    for (let i = 0; i < depth + 1; i++) {
        const mock = mockURLFromFile(
            ENTRY_POINT_URL,
            `${DEPTH_PATH_PREFIX}${i}`,
            path.join(DEPTH_FOLDER, `depth-${i}.html`),
            false
        );
        mocks.push(mock);
    }

    return mocks;
}

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    init(LOCAL_STORAGE_DIR);
});

beforeEach(() => {
    clean();
});

describe('happy path', () => {
    const expectedBasePath = '/';
    const expectedChildPath = '/sub-page-1';

    let entryURLMock: Scope;
    let subPageMock: Scope;

    let response: URL[];

    beforeAll(async () => {
        entryURLMock = mockURLFromFile(
            ENTRY_POINT_URL,
            expectedBasePath,
            path.join(ASSET_FOLDER, 'entry-point.html'),
            false
        );
        subPageMock = mockURLFromFile(
            ENTRY_POINT_URL,
            expectedChildPath,
            path.join(ASSET_FOLDER, 'sub-page-1.html'),
            false
        );
        const provider = new ApifyProvider(MAX_CRAWL_DEPTH);
        const observable = provider.crawl(ENTRY_POINT_URL);

        response = await receiveObservableOutput(observable);
    });


    test('crawler hits all URLs linked from starting URL once', () => {
        expect(entryURLMock.isDone()).toBe(true);
        expect(subPageMock.isDone()).toBe(true);
    });
    
    test('crawler returns all URLs linked from starting URL', () => {
        const responseBaseURL = response[0];
        const responseChildURL = response[1];
        
        expect(response).toHaveLength(2);
        
        expect(responseBaseURL.origin).toEqual(ENTRY_POINT_URL.origin);
        expect(responseBaseURL.pathname).toEqual(expectedBasePath);

        expect(responseChildURL.origin).toEqual(ENTRY_POINT_URL.origin);
        expect(responseChildURL.pathname).toEqual(expectedChildPath);
    });
});

test('crawler only returns one URL if page only refers to itself', async () => {
    const expectedCirclePath = '/circle';
    mockURLFromFile(
        ENTRY_POINT_URL,
        expectedCirclePath,
        path.join(ASSET_FOLDER, 'circle.html'),
        true
    );
    const provider = new ApifyProvider(MAX_CRAWL_DEPTH);
    const circleURL = new URL(`${ENTRY_POINT_URL.origin}${expectedCirclePath}`);

    const observable = provider.crawl(circleURL);
    const response = await receiveObservableOutput(observable);

    expect(response).toHaveLength(1);
    expect(response[0]).toEqual(circleURL);
});

describe('depth testing', () => {
    const expectedNumberOfURLSCrawled = MAX_CRAWL_DEPTH + 1;

    let mockSites: Scope[];
    let response: URL[];

    beforeAll(async () => {
        mockSites = mockDepthURLs(expectedNumberOfURLSCrawled);
        const provider = new ApifyProvider(MAX_CRAWL_DEPTH);
        const depthStartURL = new URL(
            `${ENTRY_POINT_URL.origin}${DEPTH_PATH_PREFIX}0`
        );

        const observable = provider.crawl(depthStartURL);
        response = await receiveObservableOutput(observable);
    });

    test('crawler hits urls until maximum depth is reached', () => {
        for (let i = 0; i < expectedNumberOfURLSCrawled; i++) {
            expect(mockSites[i].isDone()).toBe(true);
        }

        const expectedNotCrawledSite = mockSites[expectedNumberOfURLSCrawled];
        expect(expectedNotCrawledSite.isDone()).toBe(false);
    });

    test('crawler returns URLs up to maximum crawl depth', () => {
        expect(response).toHaveLength(expectedNumberOfURLSCrawled);

        for (let i = 0; i < expectedNumberOfURLSCrawled; i++) {
            expect(response).toContainEqual(
                new URL(
                    `${ENTRY_POINT_URL.origin}${DEPTH_PATH_PREFIX}${i}`
                )
            );
        }
    });

    afterAll(() => {
        nock.cleanAll();
    });
});

afterAll(() => {
    destroy();
});
