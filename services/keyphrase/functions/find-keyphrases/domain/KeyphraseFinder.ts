import HTMLParsingProvider from "../ports/HTMLParsingProvider";
import HTTPRequestProvider from "../ports/HTTPRequestProvider";
import KeyphrasesPort from "../ports/KeyphrasePort";
import {
    KeyphraseProvider,
    KeyphraseResponse,
} from "../ports/KeyphraseProvider";
import {
    KeyphraseOccurrences,
    KeyphraseRepository,
} from "../ports/KeyphraseRepository";
import OccurrenceCounter from "../ports/OccurrenceCounter";

class KeyphraseFinder implements KeyphrasesPort {
    constructor(
        private httpRequester: HTTPRequestProvider,
        private htmlParser: HTMLParsingProvider,
        private keyphraseProvider: KeyphraseProvider,
        private occurrenceCounter: OccurrenceCounter,
        private repository: KeyphraseRepository
    ) {}

    async findKeyphrases(url: URL): Promise<boolean> {
        console.log(`Attempting to find keyphrases at ${url.toString()}`);
        let content: string;
        try {
            content = await this.httpRequester.getBody(url);
        } catch (ex: unknown) {
            console.error(
                `Error occurred during page GET: ${JSON.stringify(ex)}}`
            );

            return false;
        }

        if (content) {
            let previousPhrases: KeyphraseOccurrences[];
            try {
                previousPhrases = await this.repository.getOccurrences(
                    url.hostname
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

            try {
                await this.repository.storeOccurrences(
                    url.hostname,
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
        HTMLContent: string,
        previousPhrases: KeyphraseOccurrences[]
    ): Promise<KeyphraseOccurrences[]> {
        const text = this.htmlParser.parseHTML(HTMLContent);
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
