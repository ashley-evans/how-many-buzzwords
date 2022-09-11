/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import retext from "retext";
// @ts-ignore
import retextPos from "retext-pos";
// @ts-ignore
import retextKeywords from "retext-keywords";
// @ts-ignore
import toString from "nlcst-to-string";
import { TextRepository } from "buzzword-aws-keyphrase-service-text-repository-library";

import KeyphrasesPort from "../ports/KeyphrasePort";

class KeyphraseFinder implements KeyphrasesPort {
    constructor(private parsedContentRepository: TextRepository) {}

    async findKeyphrases(url: URL): Promise<Set<string>> {
        const uniqueKeyphrases = new Set<string>();
        const content = await this.parsedContentRepository.getPageText(url);
        if (content) {
            const parsedFile = await retext()
                .use(retextPos)
                .use(retextKeywords)
                .process(content);

            for (const keyword of parsedFile.data.keywords) {
                const current = toString(keyword.matches[0].node).toLowerCase();
                uniqueKeyphrases.add(current);
            }

            for (const keyphrase of parsedFile.data.keyphrases) {
                const current = keyphrase.matches[0].nodes
                    .map((node: unknown) => toString(node))
                    .join("")
                    .toLowerCase();
                uniqueKeyphrases.add(current);
            }
        }

        return uniqueKeyphrases;
    }
}

export default KeyphraseFinder;
