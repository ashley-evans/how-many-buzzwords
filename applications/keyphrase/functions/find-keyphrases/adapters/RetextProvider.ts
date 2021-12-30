/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import retext from 'retext';
// @ts-ignore
import retextPos from 'retext-pos';
// @ts-ignore
import retextKeywords from 'retext-keywords';
// @ts-ignore
import toString from 'nlcst-to-string';

import {
    KeyphraseProvider,
    KeyphraseResponse 
} from "../ports/KeyphraseProvider";

class RetextProvider implements KeyphraseProvider {
    async findKeyphrases(text: string): Promise<KeyphraseResponse> {
        const keyphrases: string[] = [];
        const keywords: string[] = [];
        await retext()
            .use(retextPos)
            .use(retextKeywords)
            .process(text)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((result: { data: { keywords: any; keyphrases: any; }; }) => {
                for (const keyword of result.data.keywords) {
                    const word = toString(keyword.matches[0].node);
                    keywords.push(word.toLowerCase());
                }

                for (const keyPhrase of result.data.keyphrases) {
                    const phrase = keyPhrase.matches[0].nodes.map(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (node: any) => toString(node)
                    ).join('');

                    keyphrases.push(phrase.toLowerCase());
                }
            });

        return {
            keyphrases,
            keywords
        };
    }
}

export default RetextProvider;
