interface Repository {
    storePathnames(baseURL: string, pathname: string[]): boolean
}

export default Repository;
