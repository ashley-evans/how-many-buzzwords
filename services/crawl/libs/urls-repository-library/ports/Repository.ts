import CrawlStatus from "../enums/CrawlStatus";

type Pathname = {
    pathname: string;
    createdAt: Date;
    updatedAt: Date;
};

type CrawlStatusRecord = {
    status: CrawlStatus;
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
    getCrawlStatus(baseURL: string): Promise<CrawlStatusRecord | undefined>;
    updateCrawlStatus(baseURL: string, status: CrawlStatus): Promise<boolean>;
    deleteCrawlStatus(baseURL: string): Promise<boolean>;
}

export { CrawlStatusRecord, Pathname, Repository };
