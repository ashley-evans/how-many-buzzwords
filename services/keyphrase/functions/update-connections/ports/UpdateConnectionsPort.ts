type BaseURLOccurrences = {
    baseURL: string;
    pathname: string;
    keyphrase: string;
    occurrences: number;
};

interface UpdateConnectionsPort {
    updateExistingConnections(
        occurrences: BaseURLOccurrences[]
    ): Promise<BaseURLOccurrences[]>;
}

export { BaseURLOccurrences, UpdateConnectionsPort };
