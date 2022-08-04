interface TextRepository {
    getPageText(url: URL): Promise<string>;
    storePageText(url: URL, text: string): Promise<boolean>;
}

export default TextRepository;
