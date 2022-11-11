import { convert } from "html-to-text";

import HTMLParsingProvider from "../ports/HTMLParsingProvider";

class HTMLParser implements HTMLParsingProvider {
    parseHTML(html: string): string {
        return convert(html, {
            formatters: {
                noSourceImageFormatter: function (elem, _walk, builder) {
                    const attribs = elem.attribs || {};
                    if (attribs.alt) {
                        builder.addInline(attribs.alt);
                    }
                },
            },
            selectors: [
                {
                    selector: "a",
                    options: {
                        ignoreHref: true,
                    },
                },
                {
                    selector: "img",
                    format: "noSourceImageFormatter",
                },
            ],
        });
    }
}

export default HTMLParser;
