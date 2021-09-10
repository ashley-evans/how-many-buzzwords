const { readdirSync } = require('fs-extra');
const path = require('path');
const nock = require('nock');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');

const localStorageEmulator = require('./helpers/local-storage-emulator');
const { mockURLFromFile } = require('./helpers/http-mock');

const { handler } = require('../find-words');

const ENTRY_POINT_URL = 'http://example.com/';
const LOCAL_STORAGE_DIR = path.join(__dirname, '/apify_storage/');
const ASSET_FOLDER = path.join(__dirname, '/assets/');
const DEPTH_FOLDER = path.join(ASSET_FOLDER, '/depth/');
const TABLE_NAME = 'test';

const ddbMock = mockClient(DynamoDBClient);

beforeAll(async () => {
    await localStorageEmulator.init(LOCAL_STORAGE_DIR);
    process.env.tableName = TABLE_NAME;
    process.env.maxCrawlDepth = 20;
});

beforeEach(async () => {
    await localStorageEmulator.clean();
    ddbMock.reset();
});

test('handler inserts list of child pages accessible from base url to dynamo db', async () => {
    mockURLFromFile(ENTRY_POINT_URL, '/', path.join(ASSET_FOLDER, 'entry-point.html'), false);
    mockURLFromFile(ENTRY_POINT_URL, '/sub-page-1', path.join(ASSET_FOLDER, 'sub-page-1.html'), false);
    const event = {
        Records: [
            { body: ENTRY_POINT_URL }
        ]
    };
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
    const event = {
        Records: [
            { body: `${ENTRY_POINT_URL}circle` }
        ]
    };
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

test('handler defaults to only crawl to maximum depth', async () => {
    readdirSync(DEPTH_FOLDER).forEach(file => {
        const fileName = file.split('.')[0];
        mockURLFromFile(ENTRY_POINT_URL, `/${fileName}`, path.join(DEPTH_FOLDER, file), true);
    });
    const event = {
        Records: [
            { body: `${ENTRY_POINT_URL}depth-0` }
        ]
    };
    ddbMock.on(PutItemCommand).resolves();

    await handler(event);
    const dynamoDbCallsArguments = ddbMock.calls().map(call => call.args);

    expect(dynamoDbCallsArguments).toHaveLength(parseInt(process.env.maxCrawlDepth) + 1);
});

afterEach(() => {
    nock.cleanAll();
});

afterAll(async () => {
    await localStorageEmulator.destroy();
});
