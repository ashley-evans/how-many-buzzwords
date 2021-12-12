interface Repository {
    storePathnames(baseURL: string, pathname: string[]): Promise<boolean>
}

export default Repository;
