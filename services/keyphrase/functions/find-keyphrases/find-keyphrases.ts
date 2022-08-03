import {
    KeyphraseRepository,
    Repository,
} from "buzzword-aws-keyphrase-repository-library";
import {
    TextRepository,
    TextS3Repository,
} from "buzzword-aws-text-repository-library";

import EventAdapter from "./adapters/KeyphraseEventAdapter";
import RegexCounter from "./adapters/RegexCounter";
import RetextProvider from "./adapters/RetextProvider";
import KeyphraseFinder from "./domain/KeyphraseFinder";
import {
    KeyphrasesEvent,
    KeyphrasesResponse,
} from "./ports/KeyphrasePrimaryAdapter";

function createRepository(): Repository {
    if (!process.env.KEYPHRASE_TABLE_NAME) {
        throw new Error("Keyphrases Table Name has not been set.");
    }

    return new KeyphraseRepository(process.env.KEYPHRASE_TABLE_NAME);
}

function createParsedContentRepository(): TextRepository {
    if (!process.env.PARSED_CONTENT_S3_BUCKET_NAME) {
        throw new Error("Parsed Content S3 bucket has not been set.");
    }

    return new TextS3Repository(process.env.PARSED_CONTENT_S3_BUCKET_NAME);
}

const handler = async (event: KeyphrasesEvent): Promise<KeyphrasesResponse> => {
    const repository = createRepository();
    const parsedContentRepository = createParsedContentRepository();
    const keyphraseProvider = new RetextProvider();
    const occurrenceCounter = new RegexCounter();
    const keyphraseFinder = new KeyphraseFinder(
        parsedContentRepository,
        keyphraseProvider,
        occurrenceCounter,
        repository
    );

    const primaryAdapter = new EventAdapter(keyphraseFinder);

    return await primaryAdapter.findKeyphrases(event);
};

export { handler };
