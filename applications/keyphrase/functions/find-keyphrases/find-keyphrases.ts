import { SQSBatchResponse, SQSEvent } from "aws-lambda";

import GotProvider from "./adapters/GotProvider";
import HTMLParser from "./adapters/HTMLParser";
import KeyphraseDynamoDBRepository from 
    "./adapters/KeyphraseDynamoDBRepository";
import KeyphraseSQSAdapter from "./adapters/KeyphraseSQSAdapter";
import RegexCounter from "./adapters/RegexCounter";
import RetextProvider from "./adapters/RetextProvider";
import KeyphraseFinder from "./domain/KeyphraseFinder";
import { KeyphraseRepository } from "./ports/KeyphraseRepository";

function createRepository(): KeyphraseRepository {
    if (!process.env.TABLE_NAME) {
        throw new Error('Keyphrases Table Name has not been set.');
    }

    return new KeyphraseDynamoDBRepository(process.env.TABLE_NAME);
}

const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
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

    const primaryAdapter = new KeyphraseSQSAdapter(keyphraseFinder);

    return await primaryAdapter.findKeyphrases(event);
};

export {
    handler
};
