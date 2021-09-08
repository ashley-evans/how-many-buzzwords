const nock = require('nock');
const fs = require('fs-extra');
const path = require('path');
const { StatusCodes } = require('http-status-codes');
const localStorageEmulator = require('./helpers/local-storage-emulator');

const { handler } = require('../find-words');

const ENTRY_POINT_URL = 'http://example.com/';
const LOCAL_STORAGE_DIR = path.join(__dirname, '/apify_storage/');

const readFile = (fileName) => {
    return fs.readFileSync(path.join(__dirname, '/assets/', fileName));
};

nock(ENTRY_POINT_URL)
    .get('/')
    .reply(
        200,
        readFile('entry-point.html'),
        {
            'content-type': 'text/html'
        }
    )
    .persist();

nock(ENTRY_POINT_URL)
    .get('/sub-page-1')
    .reply(
        200,
        readFile('sub-page-1.html'),
        {
            'content-type': 'text/html'
        }
    )
    .persist();

nock(ENTRY_POINT_URL)
    .get('/circle')
    .reply(
        200,
        readFile('circle.html'),
        {
            'content-type': 'text/html'
        }
    )
    .persist();

beforeAll(async () => {
    await localStorageEmulator.init(LOCAL_STORAGE_DIR);
});

beforeEach(async () => {
    await localStorageEmulator.clean();
});

test('handler returns list of pages accessible from URL', async () => {
    const event = {
        Records: [
            { body: ENTRY_POINT_URL }
        ]
    };

    const response = await handler(event);

    expect(response).toBeDefined();
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.headers['Content-Type']).toBe('application/json');

    const content = JSON.parse(response.body);
    expect(content).toHaveLength(2);
    expect(content).toContainEqual({ url: ENTRY_POINT_URL });
    expect(content).toContainEqual({ url: `${ENTRY_POINT_URL}sub-page-1` });
}, 99999);

test('handler returns only unique pages accessible from URL', async () => {
    const event = {
        Records: [
            { body: `${ENTRY_POINT_URL}circle` }
        ]
    };

    const response = await handler(event);

    expect(response).toBeDefined();
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.headers['Content-Type']).toBe('application/json');

    const content = JSON.parse(response.body);
    expect(content).toHaveLength(1);
    expect(content[0]).toEqual({ url: `${ENTRY_POINT_URL}circle` });
}, 99999);

afterAll(async () => {
    await localStorageEmulator.destroy();
});
