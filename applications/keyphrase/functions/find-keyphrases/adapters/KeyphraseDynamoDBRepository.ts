import {
    AttributeValue,
    DynamoDBClient,
    PutItemCommand,
    PutItemCommandInput,
    QueryCommand,
    QueryCommandInput,
    QueryCommandOutput
} from "@aws-sdk/client-dynamodb";

import { KeyphraseTableKeyFields, KeyphraseTableNonKeyFields } from "../enums";
import {
    KeyphraseOccurrences,
    KeyphraseRepository
} from "../ports/KeyphraseRepository";

class KeyphraseDynamoDBRepository implements KeyphraseRepository {
    private ddbClient;

    constructor(private tableName: string) {
        this.ddbClient = new DynamoDBClient({});
    }

    async getOccurrences(url: string): Promise<KeyphraseOccurrences[]> {
        const results = await this.queryOccurrences(url);
        if (results.Items === undefined) {
            return [];
        }

        return this.mapOccurrences(results.Items);
    }

    async storeOccurrences(
        url: string,
        keyphraseOccurences: KeyphraseOccurrences[]
    ): Promise<boolean> {
        for (const keyphrase of keyphraseOccurences) {
            await this.storeOccurrence(url, keyphrase);
        }

        return true;
    }

    private async queryOccurrences(url: string): Promise<QueryCommandOutput> {
        const input: QueryCommandInput = {
            TableName: this.tableName,
            KeyConditionExpression: '#url = :searchUrl',
            ExpressionAttributeNames: {
                '#url': KeyphraseTableKeyFields.HashKey
            },
            ExpressionAttributeValues: {
                ':searchUrl': { S: url }
            },
            ProjectionExpression: KeyphraseTableKeyFields.SortKey +
                `,${KeyphraseTableNonKeyFields.Occurrence}`
        };
        const command = new QueryCommand(input);

        return await this.ddbClient.send(command);
    }

    private mapOccurrences(
        items?: { [key: string]: AttributeValue }[]
    ): KeyphraseOccurrences[] {
        if (!items) {
            return [];
        }

        const response: KeyphraseOccurrences[] = [];
        for (const item of items) {
            const keyphraseAttribute = item[KeyphraseTableKeyFields.SortKey];
            if (!keyphraseAttribute || !keyphraseAttribute.S) {
                throw new Error('Query returned item with no keyphrase');
            }

            const occurrenceAttribute = item[
                KeyphraseTableNonKeyFields.Occurrence
            ];
            if (!occurrenceAttribute || isNaN(Number(occurrenceAttribute.N))) {
                throw new Error(
                    'Query returned item with occurrences that is not a number'
                );
            }

            const keyphrase = keyphraseAttribute.S;
            const occurrences = Number(occurrenceAttribute.N);

            response.push({
                keyphrase,
                occurrences
            });
        }

        return response;
    }

    private async storeOccurrence(
        url: string,
        occurrence: KeyphraseOccurrences
    ): Promise<boolean> {
        const input: PutItemCommandInput = {
            TableName: this.tableName,
            Item: {
                [KeyphraseTableKeyFields.HashKey]: {
                    S: url 
                },
                [KeyphraseTableKeyFields.SortKey]: {
                    S: occurrence.keyphrase 
                },
                [KeyphraseTableNonKeyFields.Occurrence]: {
                    N: occurrence.occurrences.toString()
                } 
            }
        };
        const command = new PutItemCommand(input);

        await this.ddbClient.send(command);

        console.log(
            `Successfully stored: ${JSON.stringify(occurrence)} for ${url}`
        );

        return true;
    }
}

export default KeyphraseDynamoDBRepository;
