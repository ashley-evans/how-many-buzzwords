import HTMLParsingProvider from "../ports/HTMLParsingProvider";
import HTTPRequestProvider from "../ports/HTTPRequestProvider";
import KeyphrasesPort from "../ports/KeyphrasePort";
import KeyphraseProvider from "../ports/KeyphraseProvider";
import KeyphraseRepository from "../ports/KeyphraseRepository";

class Keyphrases implements KeyphrasesPort {
    constructor(
        private httpRequester: HTTPRequestProvider,
        private htmlParser: HTMLParsingProvider,
        private keyphraseProvider: KeyphraseProvider,
        private repository: KeyphraseRepository
    ) {}

    findKeyphrases(url: URL): boolean {
        throw new Error(`Method not implemented. Provided url: ${url}`);
    }
}

export default Keyphrases;
