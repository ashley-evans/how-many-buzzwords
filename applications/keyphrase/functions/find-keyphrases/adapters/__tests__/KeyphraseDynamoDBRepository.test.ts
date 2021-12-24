
import { 
    DynamoDBClient,
    PutItemCommand,
    PutItemCommandInput
} from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

import { KeyphraseTableKeyFields } from '../../enums';
import KeyphraseDynamoDBRepository from '../KeyphraseDynamoDBRepository';

const ddbMock = mockClient(DynamoDBClient);

const TABLE_NAME = 'test';
const VALID_URL = 'www.example.com';

const repository = new KeyphraseDynamoDBRepository(TABLE_NAME);

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe.each([
    ['a single keyphrase', ['keyphrase']],
    ['multiple keyphrases', ['keyphrase 1', 'keyphrase 2']]
])('given %s', (message, keyphrases) => {
    beforeAll(async () => {
        ddbMock.reset();
        ddbMock.on(PutItemCommand).resolves({});

        await repository.storeKeyphrases(
            VALID_URL,
            keyphrases
        );
    });

    test('stores URL and keyphrases in DynamoDB', async () => {
        const putItemCommands = ddbMock.commandCalls(PutItemCommand);

        expect(putItemCommands).toHaveLength(keyphrases.length);
        const commandInputs = putItemCommands.map(
            command => command.args[0].input
        );

        for (const keyphrase of keyphrases) {
            const expectedInput: PutItemCommandInput = {
                TableName: TABLE_NAME,
                Item: {
                    [KeyphraseTableKeyFields.HashKey]: { S: VALID_URL },
                    [KeyphraseTableKeyFields.SortKey]: { S: keyphrase }
                }
            };

            expect(commandInputs).toContainEqual(expectedInput);
        }
    });
});
