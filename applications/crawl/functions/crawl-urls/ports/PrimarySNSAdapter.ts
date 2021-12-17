import { SQSBatchResponse, SQSEvent } from "aws-lambda";

interface PrimarySNSAdapter {
    crawl(event: SQSEvent): Promise<SQSBatchResponse>
}

export default PrimarySNSAdapter;
