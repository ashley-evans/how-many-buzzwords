import { DynamoDBStreamEvent, SQSBatchResponse } from "aws-lambda";
import {
    KeyphraseRepository,
    Repository,
} from "buzzword-keyphrase-keyphrase-repository-library";

import TotalOccurrencesStreamAdapter from "./adapters/TotalOccurrencesStreamAdapter";
import TotalOccurrencesDomain from "./domain/TotalOccurrencesDomain";

function createKeyphraseRepository(): Repository {
    if (!process.env.KEYPHRASE_TABLE_NAME) {
        throw new Error("Keyphrases Table Name has not been set.");
    }

    return new KeyphraseRepository(process.env.KEYPHRASE_TABLE_NAME);
}

const keyphraseRepository = createKeyphraseRepository();
const domain = new TotalOccurrencesDomain(keyphraseRepository);
const adapter = new TotalOccurrencesStreamAdapter(domain);

async function handler(event: DynamoDBStreamEvent): Promise<SQSBatchResponse> {
    return adapter.handleEvent(event);
}

export { handler };
