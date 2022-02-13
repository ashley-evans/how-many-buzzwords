type Pathname = {
    pathname: string;
    crawledAt: Date;
}

interface GetURLsPort {
    getPathnames(baseURL: URL): Promise<Pathname[]>;
}

export {
    Pathname,
    GetURLsPort
};
