const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');
const { StatusCodes } = require('http-status-codes');

const { handler } = require('../wibble');

const ddbMock = mockClient(DynamoDBClient);
const TABLE_NAME = 'test';

beforeAll(() => {
    process.env.tableName = TABLE_NAME;
});

beforeEach(() => {
    ddbMock.reset();
});

test('handler returns OK when DB inserts succeed for multiple records', async () => {
    const event = {
        Records: [
            { body: 'Test 1' },
            { body: 'Test 2' }
        ]
    };

    const response = await handler(event);

    expect(response).toBeDefined();
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(ddbMock.calls()).toHaveLength(event.Records.length);
});

test('handler returns failure if one DB insert fails', async () => {
    // Ignore Console error output for this test, as we expect the error to occur
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const failureBody = 'failure';
    const event = {
        Records: [
            { body: 'success' },
            { body: failureBody }
        ]
    };
    ddbMock
        .on(PutItemCommand)
        .resolves()
        .on(PutItemCommand, {
            TableName: TABLE_NAME,
            Item: {
                pk: { S: failureBody }
            }
        })
        .rejects();

    const response = await handler(event);

    expect(response).toBeDefined();
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(ddbMock.calls()).toHaveLength(event.Records.length);
});
