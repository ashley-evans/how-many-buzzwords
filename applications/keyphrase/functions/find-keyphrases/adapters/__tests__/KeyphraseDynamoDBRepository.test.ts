
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

describe('given a single keyphrase', () => {
    test('stores URL and keyphrases in DynamoDB', async () => {
        const keyphrases = ['test keyphrase'];

        ddbMock.on(PutItemCommand).resolves({});

        await repository.storeKeyphrases(
            VALID_URL,
            keyphrases
        );
    
        const putItemCommands = ddbMock.commandCalls(PutItemCommand);
    
        const expectedInput: PutItemCommandInput = {
            TableName: TABLE_NAME,
            Item: {
                [KeyphraseTableKeyFields.HashKey]: { S: VALID_URL },
                [KeyphraseTableKeyFields.SortKey]: { S: keyphrases[0] }
            }
        };

        expect(putItemCommands).toHaveLength(1);
        expect(putItemCommands[0].args).toHaveLength(1);
        expect(putItemCommands[0].args[0].input).toEqual(expectedInput);
    });
});
