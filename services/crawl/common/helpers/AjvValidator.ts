import Ajv, { JSONSchemaType, ValidateFunction, Options } from 'ajv';

import ObjectValidator from '../interfaces/ObjectValidator';

class AjvValidator<ValidType> implements ObjectValidator<ValidType> {
    private validator: ValidateFunction<ValidType>;

    constructor(schema: JSONSchemaType<ValidType>, options?: Options) {
        const ajv = new Ajv(options);
        this.validator = ajv.compile(schema);
    }

    validate(event: unknown): ValidType {
        if (typeof event === 'string') {
            event = JSON.parse(event);
        }

        if (this.validator(event)) {
            return event;
        }

        throw this.validator.errors;
    }
}

export default AjvValidator;
