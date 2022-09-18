import { DynamoDBStreamEvent, SQSBatchResponse } from "aws-lambda";

interface DynamoDBStreamAdapter {
    handleEvent(event: DynamoDBStreamEvent): Promise<SQSBatchResponse>;
}

export default DynamoDBStreamAdapter;
