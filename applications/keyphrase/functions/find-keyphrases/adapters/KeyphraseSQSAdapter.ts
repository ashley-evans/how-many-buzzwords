import Ajv, { JSONSchemaType, ValidateFunction } from "ajv";
import { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from "aws-lambda";

import KeyphrasesPort from "../ports/KeyphrasePort";
import KeyphrasePrimaryAdapter from "../ports/KeyphrasePrimaryAdapter";
import { URLsTableKeyFields } from "../enums";

interface RequestBody {
    [URLsTableKeyFields.HashKey]: string,
    [URLsTableKeyFields.SortKey]: string
}

class KeyphraseSQSAdapter implements KeyphrasePrimaryAdapter {
    private ajv: Ajv;
    private validator: ValidateFunction<RequestBody>;

    constructor(private keyphraseFinder: KeyphrasesPort) {
        this.ajv = new Ajv();
        this.validator = this.createValidator();
    }

    async findKeyphrases(event: SQSEvent): Promise<SQSBatchResponse> {
        const failedCrawls: SQSBatchItemFailure[] = [];
        for (const record of event.Records) {
            let url: URL;
            try {
                const validatedBody = this.validateRequestBody(record.body);
                url = new URL(
                    `http://${validatedBody[URLsTableKeyFields.HashKey]}` +
                    validatedBody[URLsTableKeyFields.SortKey]
                );
            } catch (ex) {
                console.error(
                    `Error occured in body validation: ${JSON.stringify(ex)}`
                );

                continue;
            }
            
            this.keyphraseFinder.findKeyphrases(url);
        }
        
        return { batchItemFailures: failedCrawls };
    }

    private createValidator(): ValidateFunction<RequestBody> {
        const schema: JSONSchemaType<RequestBody> = {
            type: "object",
            properties: {
                [URLsTableKeyFields.HashKey]: {
                    type: "string",
                    pattern: '^(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.' + 
                    '[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)$'
                },
                [URLsTableKeyFields.SortKey]: {
                    type: "string"
                }
            },
            required: [URLsTableKeyFields.HashKey, URLsTableKeyFields.SortKey]
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
