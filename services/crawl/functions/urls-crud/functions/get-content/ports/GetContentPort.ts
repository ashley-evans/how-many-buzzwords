interface GetContentPort {
    getPageContent(url: URL): Promise<string>;
}

export default GetContentPort;
