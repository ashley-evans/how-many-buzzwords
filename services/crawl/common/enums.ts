enum URLsTableKeyFields {
    HashKey = "BaseUrl",
    SortKey = "Pathname",
}

enum CrawlTopicMessageAttributes {
    EventType = "EventType",
}

enum CrawlEventTypes {
    NewURLCrawled = "NewURLCrawled",
    CrawlComplete = "CrawlComplete",
}

export { URLsTableKeyFields, CrawlTopicMessageAttributes, CrawlEventTypes };
