import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";

import ScrapeURLPort from "../ports/ScrapeURLPort";
import {
    ScrapeURLEvent,
    ScrapeURLPrimaryAdapter,
    ScrapeURLResponse,
} from "../ports/ScrapeURLPrimaryAdapter";

type ValidEventSchema = {
    baseURL: string;
    pathname: string;
};

const schema: JSONSchemaType<ValidEventSchema> = {
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

class ScrapeURLEventAdapter implements ScrapeURLPrimaryAdapter {
    private validator: AjvValidator<ValidEventSchema>;

    constructor(private port: ScrapeURLPort) {
        this.validator = new AjvValidator(schema);
    }

    async handleEvent(event: ScrapeURLEvent): Promise<ScrapeURLResponse> {
        const url = this.parseEvent(event);
        await this.port.scrapeURL(url);

        return {
            success: true,
        };
    }

    private parseEvent(event: ScrapeURLEvent): URL {
        try {
            const validEvent = this.validator.validate(event);
            return new URL(`${validEvent.baseURL}${validEvent.pathname}`);
        } catch (ex) {
            const errorContent =
                ex instanceof Error ? ex.message : JSON.stringify(ex);

            throw new Error(
                `Exception occurred during event validation: ${errorContent}`
            );
        }
    }
}

export default ScrapeURLEventAdapter;
