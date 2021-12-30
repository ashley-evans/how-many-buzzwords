interface HTTPRequestProvider {
    getBody(url: URL): Promise<string>;
}

export default HTTPRequestProvider;
