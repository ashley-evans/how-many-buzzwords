import {
    DynamoDBClient,
    PutItemCommand,
    PutItemCommandInput
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

    async storeOccurrences(
        url: string,
        keyphraseOccurences: KeyphraseOccurrences[]
    ): Promise<boolean> {
        for (const keyphrase of keyphraseOccurences) {
            await this.storeOccurrence(url, keyphrase);
        }

        return true;
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
