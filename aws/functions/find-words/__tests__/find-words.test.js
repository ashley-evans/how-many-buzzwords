const { readdirSync } = require('fs-extra');
const path = require('path');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');

const localStorageEmulator = require('./helpers/local-storage-emulator');
const { mockURLFromFile } = require('./helpers/http-mock');

const ENTRY_POINT_URL = 'http://example.com/';
const LOCAL_STORAGE_DIR = path.join(__dirname, '/apify_storage/');
const ASSET_FOLDER = path.join(__dirname, '/assets/');
const DEPTH_FOLDER = path.join(ASSET_FOLDER, '/depth/');
const TABLE_NAME = 'test';

process.env.tableName = TABLE_NAME;
process.env.maxCrawlDepth = 20;
process.env.errorLoggingEnabled = false;

const ddbMock = mockClient(DynamoDBClient);

const { handler } = require('../find-words');

const createEvent = (url, depth) => {
    return {
        Records: [
            {
                body: JSON.stringify({ url, depth }),
                eventSource: 'aws:sqs'
            }
        ]
    };
};

beforeAll(async () => {
    await localStorageEmulator.init(LOCAL_STORAGE_DIR);
});

beforeEach(async () => {
    await localStorageEmulator.clean();
    ddbMock.reset();
});

test.each([
    ['record with invalid JSON body', 'test test'],
    ['record with missing url', JSON.stringify({ depth: 20 })],
    ['record with invalid url (numeric)', JSON.stringify({ url: 20 })],
    ['record with invalid depth', JSON.stringify({ url: 'test', depth: 'test' })]
])('handler rejects %s', async (message, body) => {
    const event = {
        Records: [
            {
                body,
                eventSource: 'aws:sqs'
            }
        ]
    };
    ddbMock.on(PutItemCommand).resolves();

    const response = await handler(event);

    expect(response.body).toEqual('Event object failed validation');
    expect(response.headers['Content-Type']).toEqual('text/plain');
    expect(response.statusCode).toEqual(400);
});

test('handler inserts list of child pages accessible from base url to dynamo db', async () => {
    mockURLFromFile(ENTRY_POINT_URL, '/', path.join(ASSET_FOLDER, 'entry-point.html'), false);
    mockURLFromFile(ENTRY_POINT_URL, '/sub-page-1', path.join(ASSET_FOLDER, 'sub-page-1.html'), false);
    const event = createEvent(ENTRY_POINT_URL);
    ddbMock.on(PutItemCommand).resolves();

    await handler(event);
    const dynamoDbCallsArguments = ddbMock.calls().map(call => call.args);

    expect(dynamoDbCallsArguments).toHaveLength(2);
    for (const index in dynamoDbCallsArguments) {
        expect(dynamoDbCallsArguments[index]).toHaveLength(1);
    }

    const dynamoDbArgumentInputs = dynamoDbCallsArguments.map(args => args[0].input);
    expect(dynamoDbArgumentInputs).toContainEqual({
        TableName: TABLE_NAME,
        Item: {
            BaseUrl: { S: ENTRY_POINT_URL },
            ChildUrl: { S: ENTRY_POINT_URL }
        }
    });
    expect(dynamoDbArgumentInputs).toContainEqual({
        TableName: TABLE_NAME,
        Item: {
            BaseUrl: { S: ENTRY_POINT_URL },
            ChildUrl: { S: `${ENTRY_POINT_URL}sub-page-1` }
        }
    });
});

test('handler only inserts one entry to dynamo db when page refers to itself', async () => {
    mockURLFromFile(ENTRY_POINT_URL, '/circle', path.join(ASSET_FOLDER, 'circle.html'), true);
    const event = createEvent(`${ENTRY_POINT_URL}circle`);
    ddbMock.on(PutItemCommand).resolves();

    await handler(event);
    const dynamoDbCallsArguments = ddbMock.calls().map(call => call.args);

    expect(dynamoDbCallsArguments).toHaveLength(1);
    expect(dynamoDbCallsArguments[0]).toHaveLength(1);

    const dynamoDbArgumentInputs = dynamoDbCallsArguments.map(args => args[0].input);
    expect(dynamoDbArgumentInputs[0]).toEqual({
        TableName: TABLE_NAME,
        Item: {
            BaseUrl: { S: `${ENTRY_POINT_URL}circle` },
            ChildUrl: { S: `${ENTRY_POINT_URL}circle` }
        }
    });
});

describe('depth testing', () => {
    beforeAll(() => {
        readdirSync(DEPTH_FOLDER).forEach(file => {
            const fileName = file.split('.')[0];
            mockURLFromFile(ENTRY_POINT_URL, `/${fileName}`, path.join(DEPTH_FOLDER, file), true);
        });
    });

    beforeEach(() => {
        ddbMock.on(PutItemCommand).resolves();
    });

    test('handler defaults to only crawl to maximum depth', async () => {
        const event = createEvent(`${ENTRY_POINT_URL}depth-0`);

        await handler(event);
        const dynamoDbCalls = ddbMock.calls();

        expect(dynamoDbCalls).toHaveLength(parseInt(process.env.maxCrawlDepth) + 1);
    });

    test('handler crawls to specified depth (less than max) for a given starting point', async () => {
        const expectedDepth = 10;
        const event = createEvent(`${ENTRY_POINT_URL}depth-0`, expectedDepth);

        await handler(event);
        const dynamoDbCalls = ddbMock.calls();

        expect(dynamoDbCalls).toHaveLength(expectedDepth + 1);
    });

    test('handler crawls to maximum depth given larger specified depth', async () => {
        const expectedDepth = process.env.maxCrawlDepth + 10;
        const event = createEvent(`${ENTRY_POINT_URL}depth-0`, expectedDepth);

        await handler(event);
        const dynamoDbCalls = ddbMock.calls();

        expect(dynamoDbCalls).toHaveLength(parseInt(process.env.maxCrawlDepth) + 1);
    });
});

afterAll(async () => {
    await localStorageEmulator.destroy();
});
