import { TextRepository } from "buzzword-aws-text-repository-library";
import {
    KeyphraseOccurrences,
    Repository as KeyphraseRepository,
} from "buzzword-aws-keyphrase-repository-library";
import escapeRegExp from "lodash.escaperegexp";

import CountOccurrencesPort from "../ports/CountOccurrencesPort";

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
            let content: string;
            try {
                content = await this.parsedContentRepository.getPageText(url);
            } catch {
                return false;
            }

            const occurrences: KeyphraseOccurrences[] = [...keyphrases].reduce(
                (result: KeyphraseOccurrences[], keyphrase) => {
                    const matches = this.countMatches(content, keyphrase);
                    if (matches > 0) {
                        result.push({
                            keyphrase,
                            occurrences: matches,
                        });
                    }

                    return result;
                },
                []
            );

            if (occurrences.length > 0) {
                try {
                    return await this.keyphraseRepository.storeKeyphrases(
                        url.hostname,
                        url.pathname,
                        occurrences
                    );
                } catch {
                    return false;
                }
            }
        }

        return true;
    }

    private countMatches(content: string, textToMatch: string): number {
        const matcher = new RegExp(`\\b${escapeRegExp(textToMatch)}\\b`, "gi");
        const matches = content.match(matcher);

        return matches ? matches.length : 0;
    }
}

export default CountOccurrencesDomain;
