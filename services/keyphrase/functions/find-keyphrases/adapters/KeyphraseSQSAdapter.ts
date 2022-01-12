import Ajv, { JSONSchemaType, ValidateFunction } from "ajv";
import { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from "aws-lambda";

import KeyphrasesPort from "../ports/KeyphrasePort";
import KeyphrasePrimaryAdapter from "../ports/KeyphrasePrimaryAdapter";
import { EventFields } from "../enums";

interface RequestBody {
    [EventFields.BaseURL]: string,
    [EventFields.Pathname]: string
}

class KeyphraseSQSAdapter implements KeyphrasePrimaryAdapter {
    private ajv: Ajv;
    private validator: ValidateFunction<RequestBody>;

    constructor(private keyphraseFinder: KeyphrasesPort) {
        this.ajv = new Ajv();
        this.validator = this.createValidator();
    }

    async findKeyphrases(event: SQSEvent): Promise<SQSBatchResponse> {
        const failedKeyphraseFinds: SQSBatchItemFailure[] = [];
        for (const record of event.Records) {
            let url: URL;
            try {
                const validatedBody = this.validateRequestBody(record.body);
                url = new URL(
                    `http://${validatedBody[EventFields.BaseURL]}` +
                    validatedBody[EventFields.Pathname]
                );
            } catch (ex) {
                console.error(
                    `Error occured in body validation: ${JSON.stringify(ex)}`
                );

                continue;
            }
            
            const success = await this.keyphraseFinder.findKeyphrases(url);
            if (!success) {
                failedKeyphraseFinds.push({
                    itemIdentifier: record.messageId
                });
            }
        }
        
        return { batchItemFailures: failedKeyphraseFinds };
    }

    private createValidator(): ValidateFunction<RequestBody> {
        const schema: JSONSchemaType<RequestBody> = {
            type: "object",
            properties: {
                [EventFields.BaseURL]: {
                    type: "string",
                    pattern: '^(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.' + 
                    '[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)$'
                },
                [EventFields.Pathname]: {
                    type: "string"
                }
            },
            required: [EventFields.BaseURL, EventFields.Pathname]
        };

        return this.ajv.compile(schema);
    }

    private validateRequestBody(body: string): RequestBody {
        const json = JSON.parse(body);

        if (this.validator(json)) {
            return json;
        } else {
            throw this.validator.errors;
        }
    }
}

export default KeyphraseSQSAdapter;
