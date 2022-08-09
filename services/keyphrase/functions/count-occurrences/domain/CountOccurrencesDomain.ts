import { TextRepository } from "buzzword-aws-text-repository-library";
import { Repository as KeyphraseRepository } from "buzzword-aws-keyphrase-repository-library";

import CountOccurrencesPort from "./ports/CountOccurrencesPort";

class CountOccurrencesDomain implements CountOccurrencesPort {
    constructor(
        private parsedContentRepository: TextRepository,
        private keyphraseRepository: KeyphraseRepository
    ) {}

    async countOccurrences(
        url: URL,
        keyphrases: Set<string>
    ): Promise<boolean> {
        if (keyphrases.size > 0) {
            await this.parsedContentRepository.getPageText(url);
        }

        return true;
    }
}

export default CountOccurrencesDomain;
