import { CrawlStatus } from "buzzword-crawl-urls-repository-library";

interface EventClient {
    sentStatusUpdate(url: string, status: CrawlStatus): Promise<boolean>;
    publishURL(url: URL): Promise<boolean>;
}

export default EventClient;
