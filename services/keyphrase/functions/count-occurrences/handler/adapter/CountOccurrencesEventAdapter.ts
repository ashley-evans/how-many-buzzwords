import { CountOccurrencesPort } from "buzzword-aws-count-occurrences-domain";
import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";

import CountOccurrencesEvent from "../types/CountOccurrencesEvent";
import CountOccurrencesResponse from "../types/CountOccurrencesResponse";

type ParsedEvent = {
    url: URL;
    keyphrases: string[][];
};

const schema: JSONSchemaType<CountOccurrencesEvent> = {
    type: "object",
    properties: {
        url: {
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
    required: ["url", "keyphrases"],
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
            let url: string = validEvent.url;
            if (!isNaN(parseInt(url))) {
                throw "Number provided when expecting valid URL (hostname w/ or w/o protocol).";
            }

            if (!url.startsWith("https://") && !url.startsWith("http://")) {
                url = `https://${url}`;
            }

            return {
                url: new URL(url),
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
