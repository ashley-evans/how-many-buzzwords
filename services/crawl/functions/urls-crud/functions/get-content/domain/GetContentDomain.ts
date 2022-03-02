import { ContentRepository } from "buzzword-aws-crawl-content-repository-library";

import GetContentPort from "../ports/GetContentPort";

class GetContentDomain implements GetContentPort {
    constructor(private repository: ContentRepository) {}

    getPageContent(url: URL): Promise<string> {
        return this.repository.getPageContent(url);
    }
}

export default GetContentDomain;
