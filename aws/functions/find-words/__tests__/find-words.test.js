const nock = require('nock');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const { StatusCodes } = require('http-status-codes');

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
    );
nock(ENTRY_POINT_URL)
    .get('/sub-page-1')
    .reply(
        200,
        readFile('sub-page-1.html'),
        {
            'content-type': 'text/html'
        }
    );

beforeAll(async () => {
    process.env.APIFY_LOCAL_STORAGE_DIR = LOCAL_STORAGE_DIR;
    fs.mkdirSync(LOCAL_STORAGE_DIR);
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
});

afterAll(() => {
    delete process.env.APIFY_LOCAL_STORAGE_DIR;
    rimraf.sync(LOCAL_STORAGE_DIR);
});
