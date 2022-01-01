
import { 
    DynamoDBClient,
    PutItemCommand,
    PutItemCommandInput
} from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { URLsTableKeyFields } from "buzzword-aws-crawl-common";

import URLsTableRepository from '../URLsTableRepository';

const ddbMock = mockClient(DynamoDBClient);

const VALID_HOSTNAME = 'www.example.com';
const VALID_PATHNAME = '/example';
const TABLE_NAME = 'test';

const repository = new URLsTableRepository(TABLE_NAME);

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

test('puts url and pathname into DynamoDB table', async () => {
    ddbMock.on(PutItemCommand).resolves({});

    await repository.storePathname(VALID_HOSTNAME, VALID_PATHNAME);

    const putItemCommands = ddbMock.commandCalls(PutItemCommand);

    const expectedInput: PutItemCommandInput = {
        TableName: TABLE_NAME,
        Item: {
            [URLsTableKeyFields.HashKey]: { S: VALID_HOSTNAME },
            [URLsTableKeyFields.SortKey]: { S: VALID_PATHNAME }
        }
    };

    expect(putItemCommands).toHaveLength(1);
    expect(putItemCommands[0].args).toHaveLength(1);
    expect(putItemCommands[0].args[0].input).toEqual(expectedInput);
});

test('returns success if DynamoDB put succeeds', async () => {
    ddbMock.on(PutItemCommand).resolves({});

    const response = await repository.storePathname(
        VALID_HOSTNAME,
        VALID_PATHNAME
    );

    expect(response).toBe(true);
});

test('rejects with error if DynamoDB put fails', async () => {
    const expectedError = new Error('test error');
    ddbMock.on(PutItemCommand).rejects(expectedError);

    expect.assertions(1);
    await expect(repository.storePathname(VALID_HOSTNAME, VALID_PATHNAME))
        .rejects.toEqual(expectedError);
});
