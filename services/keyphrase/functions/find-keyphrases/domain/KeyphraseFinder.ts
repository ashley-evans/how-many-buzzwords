import {
    Repository,
    KeyphraseOccurrences,
} from "buzzword-aws-keyphrase-repository-library";
import { TextRepository } from "buzzword-aws-text-repository-library";

import KeyphrasesPort from "../ports/KeyphrasePort";
import {
    KeyphraseProvider,
    KeyphraseResponse,
} from "../ports/KeyphraseProvider";
import OccurrenceCounter from "../ports/OccurrenceCounter";

class KeyphraseFinder implements KeyphrasesPort {
    constructor(
        private parsedContentRepository: TextRepository,
        private keyphraseProvider: KeyphraseProvider,
        private occurrenceCounter: OccurrenceCounter,
        private repository: Repository
    ) {}

    async findKeyphrases(url: URL): Promise<boolean> {
        console.log(`Attempting to find keyphrases at ${url.toString()}`);
        let content: string;
        try {
            content = await this.parsedContentRepository.getPageText(url);
        } catch {
            return false;
        }

        if (content) {
            let previousPhrases: KeyphraseOccurrences[];
            try {
                previousPhrases = await this.repository.getPathKeyphrases(
                    url.hostname,
                    url.pathname
                );
            } catch (ex: unknown) {
                console.error(
                    "Error occurred during existing keyphrase retrieval: " +
                        JSON.stringify(ex)
                );

                return false;
            }

            const occurrences = await this.findKeyphrasesOccurrences(
                content,
                previousPhrases
            );

            if (occurrences.length == 0) {
                return true;
            }

            try {
                return await this.repository.storeKeyphrases(
                    url.hostname,
                    url.pathname,
                    this.addOccurrences(occurrences, previousPhrases)
                );
            } catch (ex: unknown) {
                console.error(
                    "Error occurred during occurrence storage: " +
                        JSON.stringify(ex)
                );

                return false;
            }
        }

        return true;
    }

    private async findKeyphrasesOccurrences(
        text: string,
        previousPhrases: KeyphraseOccurrences[]
    ): Promise<KeyphraseOccurrences[]> {
        const phrases = await this.keyphraseProvider.findKeyphrases(text);

        const combinedPhrases = this.combinePhrases(
            phrases,
            previousPhrases.map((occurence) => occurence.keyphrase)
        );

        return this.countAllOccurrences(text, combinedPhrases);
    }

    private combinePhrases(
        keyphrases: KeyphraseResponse,
        existing: string[]
    ): string[] {
        const allPhrases = [
            ...keyphrases.keywords,
            ...keyphrases.keyphrases,
            ...existing,
        ];

        return [...new Set(allPhrases)];
    }

    private countAllOccurrences(
        text: string,
        words: string[]
    ): KeyphraseOccurrences[] {
        return words.map((word) => this.countOccurrences(text, word));
    }

    private countOccurrences(text: string, word: string): KeyphraseOccurrences {
        const occurrences = this.occurrenceCounter.countOccurrences(text, word);

        return {
            keyphrase: word,
            occurrences,
        };
    }

    private addOccurrences(
        newOccurrences: KeyphraseOccurrences[],
        existingOccurrences: KeyphraseOccurrences[]
    ): KeyphraseOccurrences[] {
        return newOccurrences.map((occurrence) => {
            const match = existingOccurrences.find(
                (x) => x.keyphrase === occurrence.keyphrase
            );
            const phrase: KeyphraseOccurrences = {
                keyphrase: occurrence.keyphrase,
                occurrences: occurrence.occurrences,
            };

            if (match) {
                phrase.occurrences += match.occurrences;
            }

            return phrase;
        });
    }
}

export default KeyphraseFinder;
