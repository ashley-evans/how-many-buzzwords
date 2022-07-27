import { CrawlStatus } from "buzzword-aws-crawl-urls-repository-library";

interface EventClient {
    sentStatusUpdate(url: string, status: CrawlStatus): Promise<boolean>;
}

export default EventClient;
