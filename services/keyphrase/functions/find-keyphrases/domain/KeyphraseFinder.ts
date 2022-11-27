import { TextRepository } from "buzzword-keyphrase-text-repository-library";

import KeyphrasesPort from "../ports/KeyphrasePort.js";

class KeyphraseFinder implements KeyphrasesPort {
    constructor(private parsedContentRepository: TextRepository) {}

    async findKeyphrases(url: URL): Promise<Set<string>> {
        const uniqueKeyphrases = new Set<string>();
        const content = await this.parsedContentRepository.getPageText(url);
        if (content) {
            const { retext } = await import("retext");
            const retextPos = (await import("retext-pos")).default;
            const retextKeywords = (await import("retext-keywords")).default;
            const { toString } = await import("nlcst-to-string");

            console.log(`Starting keyphrase analysis for: ${url.toString()}`);
            const parsedFile = await retext()
                .use(retextPos)
                .use(retextKeywords)
                .process(content);
            console.log(`Completed keyphrase analysis for: ${url.toString()}`);

            if (parsedFile.data.keywords) {
                for (const keyword of parsedFile.data.keywords) {
                    const current = toString(
                        keyword.matches[0].node
                    ).toLowerCase();
                    uniqueKeyphrases.add(current);
                }
            }

            if (parsedFile.data.keyphrases) {
                for (const keyphrase of parsedFile.data.keyphrases) {
                    const current = keyphrase.matches[0].nodes
                        .map((node) => toString(node))
                        .join("")
                        .toLowerCase();
                    uniqueKeyphrases.add(current);
                }
            }
        }

        return uniqueKeyphrases;
    }
}

export default KeyphraseFinder;
