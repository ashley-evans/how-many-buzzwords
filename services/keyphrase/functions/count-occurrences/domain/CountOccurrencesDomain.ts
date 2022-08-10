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
            const matches = this.countMatches(content, keyphrase);
            if (matches > 0) {
                await this.keyphraseRepository.storeKeyphrases(
                    url.hostname,
                    url.pathname,
                    {
                        keyphrase: "test",
                        occurrences: matches,
                    }
                );
            }
        }

        return true;
    }

    private countMatches(content: string, textToMatch: string): number {
        const matcher = new RegExp(textToMatch, "gi");
        const matches = content.match(matcher);

        return matches ? matches.length : 0;
    }
}

export default CountOccurrencesDomain;
