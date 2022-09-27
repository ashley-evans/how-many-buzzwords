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
        await this.port.queryKeyphrases(event.arguments.baseURL);
        return [];
    }
}

export default QueryKeyphrasesAppSyncAdapter;
