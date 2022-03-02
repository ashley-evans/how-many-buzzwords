import { Repository } from "buzzword-aws-crawl-urls-repository-library";

import { GetURLsPort, PathnameResponse } from "../ports/GetURLsPort";

class GetURLsDomain implements GetURLsPort {
    constructor(private repository: Repository) {}

    async getPathnames(baseURL: URL): Promise<PathnameResponse[]> {
        const pathnames = await this.repository.getPathnames(baseURL.hostname);

        return pathnames.map((pathname) => {
            return {
                pathname: pathname.pathname,
                crawledAt: pathname.createdAt,
            };
        });
    }
}

export default GetURLsDomain;
