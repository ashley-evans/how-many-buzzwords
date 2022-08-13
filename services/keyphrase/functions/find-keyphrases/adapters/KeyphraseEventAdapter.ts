import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";

import KeyphrasesPort from "../ports/KeyphrasePort";
import {
    KeyphrasesEvent,
    KeyphrasesResponse,
    KeyphrasePrimaryAdapter,
} from "../ports/KeyphrasePrimaryAdapter";

const schema: JSONSchemaType<KeyphrasesEvent> = {
    type: "object",
    properties: {
        baseURL: {
            type: "string",
        },
        pathname: {
            type: "string",
        },
    },
    required: ["baseURL", "pathname"],
};

class KeyphraseEventAdapter implements KeyphrasePrimaryAdapter {
    private validator: AjvValidator<KeyphrasesEvent>;

    constructor(private keyphraseFinder: KeyphrasesPort) {
        this.validator = new AjvValidator(schema);
    }

    async findKeyphrases(
        event: Partial<KeyphrasesEvent>
    ): Promise<KeyphrasesResponse> {
        const parsedURL = this.parseEvent(event);
        const keyphrases = await this.keyphraseFinder.findKeyphrases(parsedURL);
        return {
            keyphrases: [...keyphrases],
        };
    }

    private parseEvent(event: Partial<KeyphrasesEvent>): URL {
        try {
            const validEvent = this.validator.validate(event);
            let baseURL: string = validEvent.baseURL;
            if (!isNaN(parseInt(baseURL))) {
                throw "Number provided when expecting valid base URL (hostname w/ or w/o protocol).";
            }

            if (
                !baseURL.startsWith("https://") &&
                !baseURL.startsWith("http://")
            ) {
                baseURL = `https://${baseURL}`;
            }

            return new URL(`${baseURL}${validEvent.pathname}`);
        } catch (ex) {
            const errorContent =
                ex instanceof Error ? ex.message : JSON.stringify(ex);

            throw new Error(
                `Exception occurred during event validation: ${errorContent}`
            );
        }
    }
}

export default KeyphraseEventAdapter;
