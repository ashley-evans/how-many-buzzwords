type PathnameResponse = {
    pathname: string;
    crawledAt: Date;
};

interface GetURLsPort {
    getPathnames(baseURL: URL): Promise<PathnameResponse[]>;
}

export { PathnameResponse, GetURLsPort };
