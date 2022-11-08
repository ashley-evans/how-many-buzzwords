import {
    Repository,
    KeyphraseTableConstants,
    KeyphraseOccurrences,
} from "buzzword-keyphrase-keyphrase-repository-library";

import {
    KeyphraseOccurrences as DomainKeyphraseOccurrences,
    PathKeyphraseOccurrences,
    QueryKeyphrasesPort,
} from "../ports/QueryKeyphrasesPort";

const INVALID_URL_ERROR = "Invalid URL provided.";

class QueryKeyphrasesDomain implements QueryKeyphrasesPort {
    constructor(private repository: Repository) {}

    async queryKeyphrases(
        baseURL: string,
        pathname?: string
    ): Promise<PathKeyphraseOccurrences[] | DomainKeyphraseOccurrences[]> {
        if (baseURL === KeyphraseTableConstants.TotalKey) {
            const totals = await this.repository.getTotals();
            return this.mapKeyphraseOccurrences(totals);
        }

        const validatedBaseURL = this.validateBaseURL(baseURL);
        if (pathname === KeyphraseTableConstants.TotalKey) {
            const totals = await this.repository.getTotals(validatedBaseURL);
            return this.mapKeyphraseOccurrences(totals);
        } else if (pathname) {
            const validatedPath = this.validatePath(pathname);
            const stored = await this.repository.getOccurrences(
                validatedBaseURL,
                validatedPath
            );

            return this.mapKeyphraseOccurrences(stored);
        }

        const stored = await this.repository.getOccurrences(validatedBaseURL);

        return stored.map((item) => ({
            keyphrase: item.keyphrase,
            pathname: item.pathname,
            occurrences: item.occurrences,
        }));
    }

    private validateBaseURL(baseURL: string): string {
        let url = baseURL;
        if (!isNaN(parseInt(url))) {
            throw new Error(INVALID_URL_ERROR);
        }

        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            url = `http://${url}`;
        }

        try {
            return new URL(url).hostname;
        } catch {
            throw new Error(INVALID_URL_ERROR);
        }
    }

    private validatePath(pathname: string): string {
        if (pathname && !pathname.startsWith("/")) {
            throw new Error(INVALID_URL_ERROR);
        }

        return pathname;
    }

    private mapKeyphraseOccurrences(
        occurrences: KeyphraseOccurrences[]
    ): DomainKeyphraseOccurrences[] {
        return occurrences.map((occurrence) => ({
            keyphrase: occurrence.keyphrase,
            occurrences: occurrence.occurrences,
        }));
    }
}

export default QueryKeyphrasesDomain;
