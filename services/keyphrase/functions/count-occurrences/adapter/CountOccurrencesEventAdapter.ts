import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";

import CountOccurrencesEvent from "../types/CountOccurrencesEvent";
import CountOccurrencesResponse from "../types/CountOccurrencesResponse";
import CountOccurrencesPort from "../ports/CountOccurrencesPort";

type ParsedEvent = {
    url: URL;
    keyphrases: string[][];
};

const schema: JSONSchemaType<CountOccurrencesEvent> = {
    type: "object",
    properties: {
        baseURL: {
            type: "string",
        },
        pathname: {
            type: "string",
        },
        keyphrases: {
            type: "array",
            items: {
                type: "array",
                items: {
                    type: "string",
                },
            },
        },
    },
    required: ["baseURL", "pathname", "keyphrases"],
};

class CountOccurrencesEventAdapter {
    private validator: AjvValidator<CountOccurrencesEvent>;

    constructor(private port: CountOccurrencesPort) {
        this.validator = new AjvValidator(schema);
    }

    async handleEvent(
        event: Partial<CountOccurrencesEvent>
    ): Promise<CountOccurrencesResponse> {
        const parsedEvent = this.parseEvent(event);
        const success = await this.port.countOccurrences(
            parsedEvent.url,
            new Set(parsedEvent.keyphrases.flat())
        );

        if (!success) {
            throw new Error("Failed to count keyphrase occurrences.");
        }

        return { success };
    }

    private parseEvent(event: Partial<CountOccurrencesEvent>): ParsedEvent {
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

            return {
                url: new URL(`${baseURL}${validEvent.pathname}`),
                keyphrases: validEvent.keyphrases,
            };
        } catch (ex) {
            const errorContent =
                ex instanceof Error ? ex.message : JSON.stringify(ex);

            throw new Error(
                `Exception occurred during event validation: ${errorContent}`
            );
        }
    }
}

export { CountOccurrencesEventAdapter };
