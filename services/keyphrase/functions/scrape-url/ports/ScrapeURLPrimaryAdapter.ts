type ScrapeURLEvent = {
    baseURL?: string;
    pathname?: string;
};

type ScrapeURLResponse = {
    success: boolean;
};

interface ScrapeURLPrimaryAdapter {
    handleEvent(event: ScrapeURLEvent): Promise<ScrapeURLResponse>;
}

export { ScrapeURLEvent, ScrapeURLPrimaryAdapter, ScrapeURLResponse };
