import { AppSyncResolverEvent } from "aws-lambda";

import { QueryKeyphrasesArgs, Keyphrase } from "../../../schemas/schema";
import AppSyncAdapter from "../interfaces/AppSyncAdapter";
import { QueryKeyphrasesPort } from "../ports/QueryKeyphrasesPort";

class QueryKeyphrasesAppSyncAdapter
    implements AppSyncAdapter<QueryKeyphrasesArgs, Keyphrase[]>
{
    constructor(private port: QueryKeyphrasesPort) {}

    async handleQuery(
        event: AppSyncResolverEvent<QueryKeyphrasesArgs>
    ): Promise<Keyphrase[]> {
        const baseURL = event.arguments.baseURL;
        const keyphrases = await this.port.queryKeyphrases(baseURL);

        return keyphrases.map((item) => ({
            id: `${baseURL}${item.pathname}#${item.keyphrase}`,
            keyphrase: item.keyphrase,
            pathname: item.pathname,
            occurrences: item.occurrences,
        }));
    }
}

export default QueryKeyphrasesAppSyncAdapter;
