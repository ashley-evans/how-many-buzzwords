import { AjvValidator } from "@ashley-evans/buzzword-object-validator";
import { JSONSchemaType } from "ajv";
import { CrawlStatus } from "buzzword-aws-crawl-service-urls-repository-library";

import UpdateStatusPort from "../ports/UpdateStatusPort";
import {
    UpdateStatusEvent,
    UpdateStatusPrimaryAdapter,
    UpdateStatusResponse,
} from "../ports/UpdateStatusPrimaryAdapter";

type ValidEvent = {
    url: URL;
    status: CrawlStatus;
};

type ValidEventSchema = {
    url: string;
    status: CrawlStatus;
};

const schema: JSONSchemaType<ValidEventSchema> = {
    type: "object",
    properties: {
        url: {
            type: "string",
        },
        status: {
            type: "string",
            enum: Object.values(CrawlStatus),
        },
    },
    required: ["url", "status"],
};

class UpdateStatusEventAdapter implements UpdateStatusPrimaryAdapter {
    private validator: AjvValidator<ValidEventSchema>;

    constructor(private port: UpdateStatusPort) {
        this.validator = new AjvValidator(schema);
    }

    async handleEvent(event: UpdateStatusEvent): Promise<UpdateStatusResponse> {
        const validEvent = this.validateEvent(event);
        const success = await this.port.updateCrawlStatus(
            validEvent.url,
            validEvent.status
        );
        return {
            success,
        };
    }

    private validateEvent(event: UpdateStatusEvent): ValidEvent {
        try {
            const validEvent = this.validator.validate(event);
            let url = validEvent.url;
            if (!isNaN(parseInt(url))) {
                throw "Number provided when expecting URL.";
            }

            if (!url.startsWith("https://") && !url.startsWith("http://")) {
                url = `https://${url}`;
            }

            return {
                url: new URL(url),
                status: validEvent.status,
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

export default UpdateStatusEventAdapter;
