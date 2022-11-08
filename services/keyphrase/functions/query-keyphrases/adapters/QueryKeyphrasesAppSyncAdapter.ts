import { AppSyncResolverEvent } from "aws-lambda";

import {
    QueryKeyphrasesArgs,
    KeyphraseOccurrence,
} from "../../../schemas/schema";
import AppSyncAdapter from "../interfaces/AppSyncAdapter";
import {
    KeyphraseOccurrences,
    PathKeyphraseOccurrences,
    QueryKeyphrasesPort,
} from "../ports/QueryKeyphrasesPort";

class QueryKeyphrasesAppSyncAdapter
    implements AppSyncAdapter<QueryKeyphrasesArgs, KeyphraseOccurrence[]>
{
    constructor(private port: QueryKeyphrasesPort) {}

    async handleQuery(
        event: AppSyncResolverEvent<QueryKeyphrasesArgs>
    ): Promise<KeyphraseOccurrence[]> {
        const baseURL = event.arguments.baseURL;
        const pathname = event.arguments.pathname || undefined;
        const keyphrases = await this.port.queryKeyphrases(baseURL, pathname);
        return this.createResponse(baseURL, keyphrases, pathname);
    }

    private createResponse(
        baseURL: string,
        keyphrases: PathKeyphraseOccurrences[] | KeyphraseOccurrences[],
        pathname?: string
    ): KeyphraseOccurrence[] {
        return keyphrases.map((item) => {
            if (this.isPathKeyphraseOccurrence(item)) {
                return {
                    __typename: "SiteOccurrence",
                    id: `${baseURL}${item.pathname}#${item.keyphrase}`,
                    keyphrase: item.keyphrase,
                    pathname: item.pathname,
                    occurrences: item.occurrences,
                };
            }

            return {
                __typename: "PathOccurrence",
                id: `${baseURL}${pathname}#${item.keyphrase}`,
                keyphrase: item.keyphrase,
                occurrences: item.occurrences,
            };
        });
    }

    private isPathKeyphraseOccurrence(
        keyphrase: PathKeyphraseOccurrences | KeyphraseOccurrences
    ): keyphrase is PathKeyphraseOccurrences {
        return (keyphrase as PathKeyphraseOccurrences).pathname !== undefined;
    }
}

export default QueryKeyphrasesAppSyncAdapter;
