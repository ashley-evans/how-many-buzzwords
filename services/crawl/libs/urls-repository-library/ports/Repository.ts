import CrawlStatus from "../enums/CrawlStatus";

type Pathname = {
    pathname: string;
    createdAt: Date;
    updatedAt: Date;
};

interface Repository {
    deletePathnames(baseURL: string): Promise<boolean>;
    getPathnames(baseURL: string): Promise<Pathname[]>;
    getPathname(
        baseURL: string,
        pathname: string
    ): Promise<Pathname | undefined>;
    storePathname(baseURL: string, pathname: string): Promise<boolean>;
    getCrawlStatus(baseURL: string): Promise<CrawlStatus | undefined>;
    updateCrawlStatus(baseURL: string, status: CrawlStatus): Promise<boolean>;
}

export { Pathname, Repository };
