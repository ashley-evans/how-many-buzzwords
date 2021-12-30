import HTMLParsingProvider from "../ports/HTMLParsingProvider";
import HTTPRequestProvider from "../ports/HTTPRequestProvider";
import KeyphrasesPort from "../ports/KeyphrasePort";
import { KeyphraseProvider } from "../ports/KeyphraseProvider";
import {
    KeyphraseOccurrences,
    KeyphraseRepository
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
        let content: string;
        try {
            content = await this.httpRequester.getBody(url);
        } catch (ex: unknown) {
            console.error(
                `Error occured during page GET: ${JSON.stringify(ex)}}`
            );

            return false;
        }
        
        if (content) {
            const text = this.htmlParser.parseHTML(content);
            const phrases = await this.keyphraseProvider.findKeyphrases(text);

            const keyphraseOccurrences = [
                ...this.countAllOccurrences(text, phrases.keywords),
                ...this.countAllOccurrences(text, phrases.keyphrases)
            ];

            await this.repository.storeOccurrences(
                url.hostname,
                keyphraseOccurrences
            );
        }

        return true;
    }


    private countAllOccurrences(
        text: string,
        words: string[]
    ): KeyphraseOccurrences[] {
        return words.map((word) => this.countOccurrences(text, word));
    }

    private countOccurrences(
        text: string,
        word: string 
    ): KeyphraseOccurrences {
        const occurrences = this.occurrenceCounter.countOccurrences(
            text,
            word
        );

        return {
            keyphrase: word,
            occurrences
        };
    }
}

export default KeyphraseFinder;
