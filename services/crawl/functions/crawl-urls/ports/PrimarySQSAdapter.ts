import { SQSBatchResponse, SQSEvent } from "aws-lambda";

interface PrimarySQSAdapter {
    crawl(event: SQSEvent): Promise<SQSBatchResponse>
}

export default PrimarySQSAdapter;
