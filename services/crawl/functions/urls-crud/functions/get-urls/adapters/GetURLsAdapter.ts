import { AppSyncResolverEvent } from "aws-lambda";

import GraphQLAdapter from "../../../interfaces/GraphQLAdapter";
import { QueryUrlsArgs, Url } from "../../../../../schemas/schema";
import { GetURLsPort, PathnameResponse } from "../ports/GetURLsPort";

class GetURLsAdapter implements GraphQLAdapter<QueryUrlsArgs, Url | undefined> {
    private static INVALID_URL_ERROR = "Invalid ID provided, not a URL.";

    constructor(private port: GetURLsPort) {}

    async handleQuery(
        event: AppSyncResolverEvent<QueryUrlsArgs>
    ): Promise<Url | undefined> {
        const url = this.parseURLArgument(event.arguments);
        try {
            const crawledPaths = await this.port.getPathnames(url);
            return this.createResponse(url, crawledPaths);
        } catch (ex: unknown) {
            console.error(
                `Error occurred during crawl result retrieval: ${JSON.stringify(
                    ex
                )}`
            );

            throw new Error("An error occurred while obtaining crawled paths");
        }
    }

    private parseURLArgument(eventArguments: QueryUrlsArgs) {
        let url = eventArguments.id;
        if (!isNaN(parseInt(url))) {
            throw new Error(GetURLsAdapter.INVALID_URL_ERROR);
        }

        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            url = `http://${url}`;
        }

        try {
            return new URL(url);
        } catch {
            throw new Error(GetURLsAdapter.INVALID_URL_ERROR);
        }
    }

    private createResponse(
        queryURL: URL,
        crawledPaths: PathnameResponse[]
    ): Url | undefined {
        if (crawledPaths.length == 0) {
            return undefined;
        }

        return {
            id: queryURL.hostname,
            pathnames: crawledPaths.map((path) => {
                return {
                    name: path.pathname,
                    crawledAt: path.crawledAt.toISOString(),
                };
            }),
        };
    }
}

export default GetURLsAdapter;
