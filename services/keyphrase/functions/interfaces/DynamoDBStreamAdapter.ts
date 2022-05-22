import { DynamoDBStreamEvent, SQSBatchResponse } from "aws-lambda";

interface DynamoDBSteamAdapter {
    handleEvent(event: DynamoDBStreamEvent): Promise<SQSBatchResponse>;
}

export default DynamoDBSteamAdapter;
