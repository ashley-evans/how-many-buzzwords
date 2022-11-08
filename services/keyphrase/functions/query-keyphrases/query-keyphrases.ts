import { AppSyncResolverEvent } from "aws-lambda";
import {
    Repository,
    KeyphraseRepository,
} from "buzzword-keyphrase-keyphrase-repository-library";

import { KeyphraseOccurrence, QueryKeyphrasesArgs } from "../../schemas/schema";
import QueryKeyphrasesAppSyncAdapter from "./adapters/QueryKeyphrasesAppSyncAdapter";
import QueryKeyphrasesDomain from "./domain/QueryKeyphrasesDomain";

function createKeyphraseRepository(): Repository {
    if (!process.env.KEYPHRASE_TABLE_NAME) {
        throw new Error("Keyphrases Table Name has not been set.");
    }

    return new KeyphraseRepository(process.env.KEYPHRASE_TABLE_NAME);
}

const keyphraseRepository = createKeyphraseRepository();
const domain = new QueryKeyphrasesDomain(keyphraseRepository);
const adapter = new QueryKeyphrasesAppSyncAdapter(domain);

async function handler(
    event: AppSyncResolverEvent<QueryKeyphrasesArgs>
): Promise<KeyphraseOccurrence[]> {
    return adapter.handleQuery(event);
}

export { handler };
