import Repository from "../ports/Repository";
import {
    PutItemCommand,
    DynamoDBClient,
    PutItemCommandInput
} from "@aws-sdk/client-dynamodb";
import { URLsTableKeyFields } from "buzzword-aws-crawl-common";

class URLsTableRepository implements Repository {
    private ddbClient;
    constructor(private tableName: string) {
        this.ddbClient = new DynamoDBClient({});
    }

    storePathname(baseURL: string, pathname: string): Promise<boolean> {
        return new Promise((resolve, reject) => { 
            const input: PutItemCommandInput = {
                TableName: this.tableName,
                Item: {
                    [URLsTableKeyFields.HashKey]: { S: baseURL },
                    [URLsTableKeyFields.SortKey]: { S: pathname } 
                }
            };
            const command = new PutItemCommand(input);

            this.ddbClient.send(command)
                .then(() => {
                    console.log(
                        `Succesfully stored: ${pathname} for ${baseURL}`
                    );

                    resolve(true);
                })
                .catch((ex: unknown) => {
                    reject(ex);
                });
        });

    }
}

export default URLsTableRepository;
