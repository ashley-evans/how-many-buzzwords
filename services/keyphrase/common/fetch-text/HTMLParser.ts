import { Parser } from 'htmlparser2';

import HTMLParsingProvider from "./interfaces/HTMLParsingProvider";

enum UnparsableElements {
    Script = 'script',
    Style = 'style'
}

class HTMLParser implements HTMLParsingProvider {
    parseHTML(html: string): string {
        let completeText = '';
        let skip = false;
        const parser = new Parser({
            onopentag: (name) => {
                const unparsable: string[] = Object.values(UnparsableElements);
                skip = unparsable.includes(name);
            },
            ontext: (text) => {
                if (!skip) {
                    completeText = 
                        `${completeText} ${this.removeExtraWhitespace(text)}`;
                }
            }
        });

        parser.write(html);
        parser.end();
        return this.removeSpecialCharacters(completeText).trim();
    }

    private removeExtraWhitespace(text: string): string {
        return text.replace(/\s+/g, ' ');
    }

    private removeSpecialCharacters(text: string): string {
        return text.replace(/\n|\r|\t/g, '');
    }
}

export default HTMLParser;
