import { convert } from "html-to-text";

import HTMLParsingProvider from "../ports/HTMLParsingProvider";

class HTMLParser implements HTMLParsingProvider {
    parseHTML(html: string): string {
        return convert(html);
    }
}

export default HTMLParser;
