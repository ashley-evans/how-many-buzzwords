import HTMLParsingProvider from "../ports/HTMLParsingProvider";
import HTTPRequestProvider from "../ports/HTTPRequestProvider";
import KeyphrasesPort from "../ports/KeyphrasePort";
import { KeyphraseProvider } from "../ports/KeyphraseProvider";
import { KeyphraseRepository } from "../ports/KeyphraseRepository";
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

            await this.keyphraseProvider.findKeyphrases(text);
        }

        return true;
    }
}

export default KeyphraseFinder;
