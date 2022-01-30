interface Repository {
    deletePathnames(baseURL: string): Promise<boolean>
    getPathnames(baseURL: string): Promise<string[]>
    storePathname(baseURL: string, pathname: string): Promise<boolean>
}

export default Repository;
