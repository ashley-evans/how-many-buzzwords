interface ContentRepository {
    storePageContent(url: URL, content: string): Promise<boolean>;
}

export default ContentRepository;
