import { convert } from "html-to-text";

import HTMLParsingProvider from "../ports/HTMLParsingProvider";

class HTMLParser implements HTMLParsingProvider {
    parseHTML(html: string): string {
        return convert(html, {
            selectors: [{ selector: "a", options: { ignoreHref: true } }],
        });
    }
}

export default HTMLParser;
