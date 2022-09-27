import { Repository } from "buzzword-keyphrase-keyphrase-repository-library";

import {
    PathKeyphraseOccurrences,
    QueryKeyphrasesPort,
} from "../ports/QueryKeyphrasesPort";

class QueryKeyphrasesDomain implements QueryKeyphrasesPort {
    constructor(private repository: Repository) {}

    async queryKeyphrases(
        baseURL: string
    ): Promise<PathKeyphraseOccurrences[]> {
        await this.repository.getOccurrences(baseURL);
        return [];
    }
}

export default QueryKeyphrasesDomain;
