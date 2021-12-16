import path from 'path';
import { Observable } from 'rxjs';

import { init, clean, destroy } from './helpers/local-storage-emulator';
import { mockURLFromFile } from '../../../../../../helpers/http-mock';

import ApifyProvider from '../ApifyProvider';
import nock from 'nock/types';

const ENTRY_POINT_URL = new URL('http://www.example.com');

const LOCAL_STORAGE_DIR = path.join(__dirname, '/apify_storage');
const ASSET_FOLDER = path.join(__dirname, '/assets/');

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

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    init(LOCAL_STORAGE_DIR);
});

describe('happy path', () => {
    const expectedBasePath = '/';
    const expectedChildPath = '/sub-page-1';

    let entryUrlMock: nock.Scope;
    let subPageMock: nock.Scope;

    let response: URL[];

    beforeAll(async () => {
        entryUrlMock = mockURLFromFile(
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
        const provider = new ApifyProvider();
        const observable = provider.crawl(ENTRY_POINT_URL);

        response = await receiveObservableOutput(observable);
    });


    test('crawler hits all pages within a domain once', () => {
        expect(entryUrlMock.isDone()).toBe(true);
        expect(subPageMock.isDone()).toBe(true);
    });
    
    test('crawler returns all pages within a domain', () => {
        const responseBaseURL = response[0];
        const responseChildURL = response[1];
        
        expect(response).toHaveLength(2);
        
        expect(responseBaseURL.origin).toEqual(ENTRY_POINT_URL.origin);
        expect(responseBaseURL.pathname).toEqual(expectedBasePath);

        expect(responseChildURL.origin).toEqual(ENTRY_POINT_URL.origin);
        expect(responseChildURL.pathname).toEqual(expectedChildPath);
    });
});

beforeEach(() => {
    clean();
});

afterAll(() => {
    destroy();
});
