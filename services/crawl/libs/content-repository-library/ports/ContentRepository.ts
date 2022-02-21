interface ContentRepository {
    getPageContent(url: URL): Promise<string>;
    storePageContent(url: URL, content: string): Promise<boolean>;
}

export default ContentRepository;
