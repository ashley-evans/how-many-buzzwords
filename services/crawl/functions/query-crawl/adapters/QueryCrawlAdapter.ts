import { AppSyncResolverEvent } from "aws-lambda";

import { Crawl, QueryCrawlsArgs } from "../../../schemas/schema";
import GraphQLAdapter from "../../interfaces/GraphQLAdapter";
import QueryCrawlPort from "../ports/QueryCrawlPort";

class QueryCrawlAdapter implements GraphQLAdapter<QueryCrawlsArgs, Crawl[]> {
    constructor(private port: QueryCrawlPort) {}

    async handleQuery(
        event: AppSyncResolverEvent<QueryCrawlsArgs>
    ): Promise<Crawl[]> {
        const details = await this.port.queryCrawl(
            event.arguments.limit || undefined
        );

        return details.map((detail) => ({
            id: detail.baseURL.toString(),
            crawledAt: detail.crawledAt.toISOString(),
        }));
    }
}

export default QueryCrawlAdapter;
