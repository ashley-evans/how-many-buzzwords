import { SQSBatchResponse, SQSEvent } from "aws-lambda";

interface KeyphrasePrimaryAdapter {
    findKeyphrases(event: SQSEvent): Promise<SQSBatchResponse>
}

export default KeyphrasePrimaryAdapter;
