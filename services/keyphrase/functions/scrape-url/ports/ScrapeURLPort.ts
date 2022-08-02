interface ScrapeURLPort {
    scrapeURL(url: URL): Promise<boolean>;
}

export default ScrapeURLPort;
