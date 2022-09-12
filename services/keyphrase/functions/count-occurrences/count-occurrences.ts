import {
    TextRepository,
    TextS3Repository,
} from "buzzword-keyphrase-text-repository-library";
import {
    Repository,
    KeyphraseRepository,
} from "buzzword-keyphrase-keyphrase-repository-library";

import CountOccurrencesDomain from "./domain/CountOccurrencesDomain";
import CountOccurrencesEvent from "./types/CountOccurrencesEvent";
import CountOccurrencesResponse from "./types/CountOccurrencesResponse";
import { CountOccurrencesEventAdapter } from "./adapter/CountOccurrencesEventAdapter";

function createParsedContentRepository(): TextRepository {
    if (!process.env.PARSED_CONTENT_S3_BUCKET_NAME) {
        throw new Error("Parsed Content S3 bucket has not been set.");
    }

    return new TextS3Repository(process.env.PARSED_CONTENT_S3_BUCKET_NAME);
}

function createKeyphraseRepository(): Repository {
    if (!process.env.KEYPHRASE_TABLE_NAME) {
        throw new Error("Keyphrases Table Name has not been set.");
    }

    return new KeyphraseRepository(process.env.KEYPHRASE_TABLE_NAME);
}

const parsedContentRepository = createParsedContentRepository();
const keyphraseRepository = createKeyphraseRepository();
const domain = new CountOccurrencesDomain(
    parsedContentRepository,
    keyphraseRepository
);
const adapter = new CountOccurrencesEventAdapter(domain);

async function handler(
    event: Partial<CountOccurrencesEvent>
): Promise<CountOccurrencesResponse> {
    return adapter.handleEvent(event);
}

export { handler };
