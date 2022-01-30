type Pathname = {
    pathname: string;
    createdAt: Date;
    updatedAt: Date;
}

interface Repository {
    deletePathnames(baseURL: string): Promise<boolean>
    getPathnames(baseURL: string): Promise<Pathname[]>
    getPathname(
        baseURL: string,
        pathname: string
    ): Promise<Pathname | undefined>
    storePathname(baseURL: string, pathname: string): Promise<boolean>
}

export {
    Pathname,
    Repository
};
