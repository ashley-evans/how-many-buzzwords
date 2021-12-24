import {
    DynamoDBClient,
    PutItemCommand,
    PutItemCommandInput
} from "@aws-sdk/client-dynamodb";

import { KeyphraseTableKeyFields } from "../enums";
import KeyphraseRepository from "../ports/KeyphraseRepository";

class KeyphraseDynamoDBRepository implements KeyphraseRepository {
    private ddbClient;

    constructor(private tableName: string) {
        this.ddbClient = new DynamoDBClient({});
    }

    async storeKeyphrases(url: string, keyphrases: string[]): Promise<boolean> {
        for (const keyphrase of keyphrases) {
            await this.storeKeyphrase(url, keyphrase);
        }

        return true;
    }

    private async storeKeyphrase(
        url: string,
        keyphrase: string
    ): Promise<boolean> {
        const input: PutItemCommandInput = {
            TableName: this.tableName,
            Item: {
                [KeyphraseTableKeyFields.HashKey]: { S: url },
                [KeyphraseTableKeyFields.SortKey]: { S: keyphrase } 
            }
        };
        const command = new PutItemCommand(input);

        await this.ddbClient.send(command);

        console.log(`Successfully stored: ${keyphrase} for ${url}`);

        return true;
    }
}

export default KeyphraseDynamoDBRepository;
