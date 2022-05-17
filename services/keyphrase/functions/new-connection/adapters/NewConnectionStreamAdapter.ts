import { DynamoDBStreamEvent, SQSBatchResponse } from "aws-lambda";

import DynamoDBSteamAdapter from "../../interfaces/DynamoDBStreamAdapter";
import { NewConnectionPort } from "../ports/NewConnectionPort";

class NewConnectionStreamAdapter implements DynamoDBSteamAdapter {
    constructor(private port: NewConnectionPort) {}

    async handleEvent(event: DynamoDBStreamEvent): Promise<SQSBatchResponse> {
        if (Array.isArray(event.Records)) {
            return { batchItemFailures: [] };
        }

        throw new Error("Exception occurred during event validation:");
    }
}

export default NewConnectionStreamAdapter;
