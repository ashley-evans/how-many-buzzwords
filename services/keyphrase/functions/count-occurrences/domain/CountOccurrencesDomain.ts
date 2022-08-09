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
            let content;
            try {
                content = await this.parsedContentRepository.getPageText(url);
            } catch {
                return false;
            }

            const keyphrase = [...keyphrases][0];
            const matcher = new RegExp(keyphrase, "g");
            const matches = content.match(matcher);

            await this.keyphraseRepository.storeKeyphrases(
                url.hostname,
                url.pathname,
                { keyphrase: "test", occurrences: matches ? matches.length : 0 }
            );
        }

        return true;
    }
}

export default CountOccurrencesDomain;
