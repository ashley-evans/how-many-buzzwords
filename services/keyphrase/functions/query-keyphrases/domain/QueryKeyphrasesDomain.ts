import { Repository } from "buzzword-keyphrase-keyphrase-repository-library";

import {
    KeyphraseOccurrences,
    PathKeyphraseOccurrences,
    QueryKeyphrasesPort,
} from "../ports/QueryKeyphrasesPort";

const INVALID_URL_ERROR = "Invalid URL provided.";

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
        const validatedURL = this.validateURL(baseURL, pathname);
        if (pathname) {
            const stored = await this.repository.getOccurrences(
                validatedURL.hostname,
                validatedURL.pathname
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

    private validateURL(baseURL: string, pathname?: string): URL {
        let url = baseURL;
        if (!isNaN(parseInt(url))) {
            throw new Error(INVALID_URL_ERROR);
        }

        if (pathname && !pathname.startsWith("/")) {
            throw new Error(INVALID_URL_ERROR);
        }

        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            url = `http://${url}`;
        }

        try {
            return new URL(pathname ? `${url}${pathname}` : url);
        } catch {
            throw new Error(INVALID_URL_ERROR);
        }
    }
}

export default QueryKeyphrasesDomain;
