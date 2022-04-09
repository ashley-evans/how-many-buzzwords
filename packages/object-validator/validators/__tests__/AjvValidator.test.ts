import { JSONSchemaType } from "ajv";

import AjvValidator from "../AjvValidator";

type ValidResponse = {
    value: number;
};

const schema: JSONSchemaType<ValidResponse> = {
    type: "object",
    properties: {
        value: {
            type: "number",
        },
    },
    required: ["value"],
};

const VALID_INPUT: ValidResponse = {
    value: 5,
};
const INVALID_INPUT = {
    value: "test",
};

const validator = new AjvValidator<ValidResponse>(schema);

test("returns validated object given valid object", () => {
    const response = validator.validate(VALID_INPUT);

    expect(response).toEqual(VALID_INPUT);
});

test("returns validated object given valid JSON string", () => {
    const input = JSON.stringify(VALID_INPUT);

    const response = validator.validate(input);

    expect(response).toEqual(VALID_INPUT);
});

test("throws validation errors given invalid object", () => {
    expect(() => validator.validate(INVALID_INPUT)).toThrowError();
});

test("throws validation errors given invalid object as string", () => {
    const input = JSON.stringify(INVALID_INPUT);

    expect(() => validator.validate(input)).toThrowError();
});

test("throws JSON parsing error given malformed JSON string", () => {
    const input = "{ test:  }";

    expect(() => validator.validate(input)).toThrowError();
});
