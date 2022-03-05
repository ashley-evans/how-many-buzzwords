import {
    KeyphraseRepository,
    Repository,
} from "buzzword-aws-keyphrase-repository-library";

import GotProvider from "./adapters/GotProvider";
import HTMLParser from "./adapters/HTMLParser";
import EventAdapter from "./adapters/KeyphraseEventAdapter";
import RegexCounter from "./adapters/RegexCounter";
import RetextProvider from "./adapters/RetextProvider";
import KeyphraseFinder from "./domain/KeyphraseFinder";
import {
    KeyphrasesEvent,
    KeyphrasesResponse,
} from "./ports/KeyphrasePrimaryAdapter";

function createRepository(): Repository {
    if (!process.env.TABLE_NAME) {
        throw new Error("Keyphrases Table Name has not been set.");
    }

    return new KeyphraseRepository(process.env.TABLE_NAME);
}

const handler = async (event: KeyphrasesEvent): Promise<KeyphrasesResponse> => {
    const repository = createRepository();

    const requester = new GotProvider();
    const parser = new HTMLParser();
    const keyphraseProvider = new RetextProvider();
    const occurrenceCounter = new RegexCounter();

    const keyphraseFinder = new KeyphraseFinder(
        requester,
        parser,
        keyphraseProvider,
        occurrenceCounter,
        repository
    );

    const primaryAdapter = new EventAdapter(keyphraseFinder);

    return await primaryAdapter.findKeyphrases(event);
};

export { handler };
