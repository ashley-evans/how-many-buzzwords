enum URLsTableKeyFields {
    HashKey = 'BaseUrl',
    SortKey = 'Pathname'
}

enum CrawlEventTypes {
    NewURLCrawled = 'NewURLCrawled',
    CrawlComplete = 'CrawlComplete'
}

export {
    URLsTableKeyFields,
    CrawlEventTypes
};
