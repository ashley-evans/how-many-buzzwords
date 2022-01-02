interface Repository {
    storePathname(baseURL: string, pathname: string): Promise<boolean>
}

export default Repository;
