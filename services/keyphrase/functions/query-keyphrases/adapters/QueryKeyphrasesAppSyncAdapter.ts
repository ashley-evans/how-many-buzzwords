import { AppSyncResolverEvent } from "aws-lambda";

import {
    QueryKeyphrasesArgs,
    KeyphraseOccurrence,
} from "../../../schemas/schema";
import AppSyncAdapter from "../interfaces/AppSyncAdapter";
import { QueryKeyphrasesPort } from "../ports/QueryKeyphrasesPort";

class QueryKeyphrasesAppSyncAdapter
    implements AppSyncAdapter<QueryKeyphrasesArgs, KeyphraseOccurrence[]>
{
    constructor(private port: QueryKeyphrasesPort) {}

    async handleQuery(
        event: AppSyncResolverEvent<QueryKeyphrasesArgs>
    ): Promise<KeyphraseOccurrence[]> {
        const baseURL = event.arguments.baseURL;
        const pathname = event.arguments.pathname;
        if (pathname) {
            const keyphrases = await this.port.queryKeyphrases(
                baseURL,
                pathname
            );

            return keyphrases.map((item) => ({
                __typename: "PathOccurrence",
                id: `${baseURL}${pathname}#${item.keyphrase}`,
                keyphrase: item.keyphrase,
                occurrences: item.occurrences,
            }));
        }

        const keyphrases = await this.port.queryKeyphrases(baseURL);
        return keyphrases.map((item) => ({
            __typename: "SiteOccurrence",
            id: `${baseURL}${item.pathname}#${item.keyphrase}`,
            keyphrase: item.keyphrase,
            pathname: item.pathname,
            occurrences: item.occurrences,
        }));
    }
}

export default QueryKeyphrasesAppSyncAdapter;
