import Ajv, { JSONSchemaType, ValidateFunction } from "ajv";
import KeyphrasesError from "../errors/KeyphrasesError";

import KeyphrasesPort from "../ports/KeyphrasePort";
import {
    KeyphrasesEvent,
    KeyphrasesResponse,
    KeyphrasePrimaryAdapter 
} from "../ports/KeyphrasePrimaryAdapter";

interface RequestBody {
    baseURL: string,
    pathname: string
}

class KeyphraseEventAdapter implements KeyphrasePrimaryAdapter {
    private ajv: Ajv;
    private validator: ValidateFunction<RequestBody>;

    constructor(private keyphraseFinder: KeyphrasesPort) {
        this.ajv = new Ajv();
        this.validator = this.createValidator();
    }

    async findKeyphrases(event: KeyphrasesEvent): Promise<KeyphrasesResponse> {
        let url: URL;
        try {
            const validatedBody = this.validateRequestBody(event);
            url = new URL(
                `https://${validatedBody.baseURL}${validatedBody.pathname}`
            );
        } catch (ex) {
            console.error(
                `Error occured in body validation: ${JSON.stringify(ex)}`
            );

            return { success: false };
        }

        try {
            const success = await this.keyphraseFinder.findKeyphrases(url);
            if (!success) {
                throw new KeyphrasesError(
                    'Keyphrase finder failed to execute.'
                );
            }

            return { success };
        } catch (ex: unknown) {
            if (ex instanceof KeyphrasesError) {
                throw ex;
            }

            throw new KeyphrasesError(
                `Error occurred during keyphrase finding: ${JSON.stringify(ex)}`
            );
        }
    }

    private createValidator(): ValidateFunction<RequestBody> {
        const schema: JSONSchemaType<RequestBody> = {
            type: "object",
            properties: {
                baseURL: {
                    type: "string",
                    pattern: '^(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.' + 
                    '[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)$'
                },
                pathname: {
                    type: "string"
                }
            },
            required: ["baseURL", "pathname"]
        };

        return this.ajv.compile(schema);
    }

    private validateRequestBody(event: KeyphrasesEvent): RequestBody {
        if (this.validator(event)) {
            return event;
        } else {
            throw this.validator.errors;
        }
    }
}

export default KeyphraseEventAdapter;
