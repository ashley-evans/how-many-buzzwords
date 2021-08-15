const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');
const { StatusCodes } = require('http-status-codes');

const { handler } = require('../wibble');

const ddbMock = mockClient(DynamoDBClient);

beforeEach(() => {
    ddbMock.reset();
});

test('handler returns success when DB insert succeeds', async () => {
    ddbMock.on(PutItemCommand)
        .resolves({ Item: undefined });

    const response = await handler();

    expect(response).toBeDefined();
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.body).toBe('Insert Success');
});

test('handler returns failure error when DB insert fails', async () => {
    const expectedError = { error: 'Test Error' };
    ddbMock.on(PutItemCommand)
        .rejects(expectedError);

    const response = await handler();

    expect(response).toBeDefined();
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.body).toBe(JSON.stringify(expectedError));
});
