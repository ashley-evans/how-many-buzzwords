import HTMLParsingProvider from "../ports/HTMLParsingProvider";
import HTTPRequestProvider from "../ports/HTTPRequestProvider";
import KeyphrasesPort from "../ports/KeyphrasePort";
import { KeyphraseProvider } from "../ports/KeyphraseProvider";
import { KeyphraseRepository } from "../ports/KeyphraseRepository";

class KeyphraseFinder implements KeyphrasesPort {
    constructor(
        private httpRequester: HTTPRequestProvider,
        private htmlParser: HTMLParsingProvider,
        private keyphraseProvider: KeyphraseProvider,
        private repository: KeyphraseRepository
    ) {}

    async findKeyphrases(url: URL): Promise<boolean> {
        await this.httpRequester.getBody(url);
        
        return true;
    }
}

export default KeyphraseFinder;