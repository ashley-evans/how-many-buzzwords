interface HTTPRequestProvider {
    getURLContent(url: URL): Promise<string>;
}

export default HTTPRequestProvider;
