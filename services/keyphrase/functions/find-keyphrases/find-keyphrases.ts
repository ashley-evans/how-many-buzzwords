import {
    TextRepository,
    TextS3Repository,
} from "buzzword-keyphrase-text-repository-library";

import EventAdapter from "./adapters/KeyphraseEventAdapter.js";
import KeyphraseFinder from "./domain/KeyphraseFinder.js";
import { KeyphrasesEvent } from "./ports/KeyphrasePrimaryAdapter.js";

function createParsedContentRepository(): TextRepository {
    if (!process.env.PARSED_CONTENT_S3_BUCKET_NAME) {
        throw new Error("Parsed Content S3 bucket has not been set.");
    }

    return new TextS3Repository(process.env.PARSED_CONTENT_S3_BUCKET_NAME);
}

const parsedContentRepository = createParsedContentRepository();
const keyphraseFinder = new KeyphraseFinder(parsedContentRepository);
const primaryAdapter = new EventAdapter(keyphraseFinder);

const handler = (event: KeyphrasesEvent): Promise<string[]> => {
    return primaryAdapter.findKeyphrases(event);
};

export { handler };
