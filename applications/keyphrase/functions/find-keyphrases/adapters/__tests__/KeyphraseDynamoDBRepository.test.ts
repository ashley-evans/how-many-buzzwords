
import { 
    AttributeValue,
    DynamoDBClient,
    PutItemCommand,
    PutItemCommandInput,
    QueryCommand,
    QueryCommandOutput
} from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { ResponseMetadata } from '@aws-sdk/types';
import { mock } from 'jest-mock-extended';

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

function createQueryOutputItem(
    keyphrase?: string,
    occurrences?: string
): { [key: string]: AttributeValue } {
    const item: { [key: string]: AttributeValue } = {
        
    };   
    if (keyphrase) {
        item[KeyphraseTableKeyFields.SortKey] = {
            S: keyphrase
        };
    }

    if (occurrences) {
        item[KeyphraseTableNonKeyFields.Occurrence] = {
            N: occurrences
        };
    }

    return item;
}

function createDynamoDBKeyphraseOutput(
    ...occurrences: KeyphraseOccurrences[]
): QueryCommandOutput {
    const output: QueryCommandOutput = {
        Items: [],
        $metadata: mock<ResponseMetadata>()
    };

    for (const occurrence of occurrences) {
        output.Items?.push(
            createQueryOutputItem(
                occurrence.keyphrase, 
                occurrence.occurrences.toString()
            )
        );
    }

    return output;
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

describe('get occurrences', () => {
    describe('given a URL with has associated occurrences', () => {
        const occurrences: KeyphraseOccurrences[] = [
            createKeyphraseOccurrence('phrase 1', 1),
            createKeyphraseOccurrence('phrase 2', 2)
        ];

        let response: KeyphraseOccurrences[];

        beforeAll(async () => {
            const output = createDynamoDBKeyphraseOutput(...occurrences);

            ddbMock.reset();
            ddbMock.on(QueryCommand).resolves(output);

            response = await repository.getOccurrences(VALID_URL);
        });

        test(
            'calls DynamoDB with the provided URL and requests occurrences',
            () => {
                const commands = ddbMock.commandCalls(QueryCommand);

                expect(commands).toHaveLength(1);
                expect(commands[0].args).toHaveLength(1);

                const input = commands[0].args[0].input;
                expect(input).toEqual(
                    expect.objectContaining({
                        TableName: TABLE_NAME,
                        ProjectionExpression: KeyphraseTableKeyFields.SortKey +
                            `,${KeyphraseTableNonKeyFields.Occurrence}`
                    })
                );

                for (const property in input.ExpressionAttributeValues) {
                    expect(input.ExpressionAttributeValues[property]).toEqual({
                        S: VALID_URL
                    });
                }
            }
        );

        test('returns the associated occurrences', () => {
            expect(response).toEqual(occurrences);
        });
    });

    test.each([
        ['undefined items array', undefined],
        ['empty items array', []]  
    ])(
        'returns empty array if %s is returned from DynamoDB',
        async (message: string, items?: never[]) => {
            ddbMock.reset();

            const output: QueryCommandOutput = {
                Items: items,
                $metadata: mock<ResponseMetadata>()
            };
            ddbMock.on(QueryCommand).resolves(output);

            const response = await repository.getOccurrences(VALID_URL);

            expect(response).toEqual([]);
        }
    );

    test.each([
        [
            'does not contain a keyphrase attribute',
            createQueryOutputItem(undefined, '1'),
            'Query returned item with no keyphrase'
        ],
        [
            'does not contain a keyphrase attribute of string type',
            {
                [KeyphraseTableKeyFields.SortKey]: {
                    N: 'phrase'
                }
            },
            'Query returned item with no keyphrase'
        ],
        [
            'does not contain an occurrences attribute',
            createQueryOutputItem('phrase'),
            'Query returned item with occurrences that is not a number'
        ],
        [
            'does not contain an occurrences attribute of number type',
            {
                [KeyphraseTableKeyFields.SortKey]: {
                    S: 'phrase'
                },
                [KeyphraseTableNonKeyFields.Occurrence]: {
                    S: '1'
                }
            },
            'Query returned item with occurrences that is not a number'
        ],
        [
            'contains occurrences attribute that is not a number',
            createQueryOutputItem('phrase', 'invalid'),
            'Query returned item with occurrences that is not a number'
        ]
    ])(
        'throws error if DynamoDB entry %s',
        async (
            message: string, 
            errorItem: { [key: string]: AttributeValue },
            expectedErrorMessage: string
        ) => {
            ddbMock.reset();

            const output: QueryCommandOutput = {
                Items: [errorItem],
                $metadata: mock<ResponseMetadata>()
            };
            ddbMock.on(QueryCommand).resolves(output);

            expect.assertions(1);
            await expect(repository.getOccurrences(VALID_URL)).rejects.toEqual(
                new Error(expectedErrorMessage)
            );
        }
    );

    test('throws error if DynamoDB query fails', async () => {
        ddbMock.reset();

        const expectedError = new Error('Test');
        ddbMock.on(QueryCommand).rejects(expectedError);

        expect.assertions(1);
        await expect(repository.getOccurrences(VALID_URL)).rejects.toEqual(
            expectedError
        );
    });
});
