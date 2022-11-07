import { Repository } from "buzzword-keyphrase-keyphrase-repository-library";

import {
    KeyphraseOccurrences,
    PathKeyphraseOccurrences,
    QueryKeyphrasesPort,
} from "../ports/QueryKeyphrasesPort";

const INVALID_BASE_URL_ERROR = "Invalid base URL provided.";

class QueryKeyphrasesDomain implements QueryKeyphrasesPort {
    constructor(private repository: Repository) {}

    queryKeyphrases(baseURL: string): Promise<PathKeyphraseOccurrences[]>;
    queryKeyphrases(
        baseURL: string,
        pathname: string
    ): Promise<KeyphraseOccurrences[]>;

    async queryKeyphrases(
        baseURL: string,
        pathname?: string
    ): Promise<PathKeyphraseOccurrences[] | KeyphraseOccurrences[]> {
        const validatedURL = this.validateURL(baseURL);
        if (pathname) {
            const stored = await this.repository.getOccurrences(
                validatedURL.hostname,
                pathname
            );

            return stored.map((item) => ({
                keyphrase: item.keyphrase,
                occurrences: item.occurrences,
            }));
        }

        const stored = await this.repository.getOccurrences(
            validatedURL.hostname
        );

        return stored.map((item) => ({
            keyphrase: item.keyphrase,
            pathname: item.pathname,
            occurrences: item.occurrences,
        }));
    }

    private validateURL(baseURL: string): URL {
        let url = baseURL;
        if (!isNaN(parseInt(url))) {
            throw new Error(INVALID_BASE_URL_ERROR);
        }

        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            url = `http://${url}`;
        }

        try {
            return new URL(url);
        } catch {
            throw new Error(INVALID_BASE_URL_ERROR);
        }
    }
}

export default QueryKeyphrasesDomain;
