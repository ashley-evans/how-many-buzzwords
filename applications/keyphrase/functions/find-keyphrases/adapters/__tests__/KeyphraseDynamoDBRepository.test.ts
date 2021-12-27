
import { 
    DynamoDBClient,
    PutItemCommand,
    PutItemCommandInput
} from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields
} from '../../enums';
import { KeyphraseOccurrences } from '../../ports/KeyphraseRepository';
import KeyphraseDynamoDBRepository from '../KeyphraseDynamoDBRepository';

const ddbMock = mockClient(DynamoDBClient);

const TABLE_NAME = 'test';
const VALID_URL = 'www.example.com';

const repository = new KeyphraseDynamoDBRepository(TABLE_NAME);

function createKeyphraseOccurrence(
    phrase: string,
    occurrences: number
): KeyphraseOccurrences {
    return {
        keyphrase: phrase,
        occurrences
    };
}

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('store occurrences', () => {

    describe.each([
        [
            'a single keyphrase occurrence',
            [
                createKeyphraseOccurrence('keyphrase 1', 1)
            ]
        ],
        [
            'multiple keyphrases occurrences',
            [
                createKeyphraseOccurrence('keyphrase 1', 1),
                createKeyphraseOccurrence('keyphrase 2', 2)
            ]
        ]
    ])('given %s', (message: string, occurrences : KeyphraseOccurrences[]) => {
        let response: boolean;

        beforeAll(async () => {
            ddbMock.reset();
            ddbMock.on(PutItemCommand).resolves({});

            response = await repository.storeOccurrences(
                VALID_URL,
                occurrences
            );
        });

        test('stores URL and keyphrases in DynamoDB', async () => {
            const putItemCommands = ddbMock.commandCalls(PutItemCommand);

            expect(putItemCommands).toHaveLength(occurrences.length);
            const commandInputs = putItemCommands.map(
                command => command.args[0].input
            );

            for (const occurrence of occurrences) {
                const expectedInput: PutItemCommandInput = {
                    TableName: TABLE_NAME,
                    Item: {
                        [KeyphraseTableKeyFields.HashKey]: {
                            S: VALID_URL 
                        },
                        [KeyphraseTableKeyFields.SortKey]: {
                            S: occurrence.keyphrase 
                        },
                        [KeyphraseTableNonKeyFields.Occurrence]: {
                            N: occurrence.occurrences.toString()
                        }
                    }
                };

                expect(commandInputs).toContainEqual(expectedInput);
            }
        });

        test('returns success if dynamoDB call succeeds', () => {
            expect(response).toBe(true);
        });
    });

    test(
        'throws exception if an error occurs during DynamoDB insert',
        async () => {
            const expectedError = new Error('test error');
            ddbMock.on(PutItemCommand).rejects(expectedError);

            expect.assertions(1);
            await expect(repository.storeOccurrences(
                VALID_URL,
                [createKeyphraseOccurrence('phrase 1', 1)]
            )).rejects.toEqual(expectedError);
        }
    );

    describe('given an empty array of occurrences', () => {
        let response: boolean;

        beforeAll(async () => {
            ddbMock.reset();
            ddbMock.on(PutItemCommand).resolves({});

            response = await repository.storeOccurrences(
                VALID_URL,
                []
            );
        });


        test('does not call DynamoDB', () => {
            expect(ddbMock.calls()).toHaveLength(0);
        });

        test('returns success', () => {
            expect(response).toBe(true);
        });
    });
});
