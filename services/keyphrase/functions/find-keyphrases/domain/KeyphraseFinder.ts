import { TextRepository } from "buzzword-keyphrase-text-repository-library";
import { retext } from "retext";
import retextPos from "retext-pos";
import retextKeywords from "retext-keywords";
import { toString } from "nlcst-to-string";

import KeyphrasesPort from "../ports/KeyphrasePort.js";

class KeyphraseFinder implements KeyphrasesPort {
    constructor(private parsedContentRepository: TextRepository) {}

    async findKeyphrases(url: URL): Promise<Set<string>> {
        const uniqueKeyphrases = new Set<string>();
        const content = await this.parsedContentRepository.getPageText(url);
        if (content) {
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
