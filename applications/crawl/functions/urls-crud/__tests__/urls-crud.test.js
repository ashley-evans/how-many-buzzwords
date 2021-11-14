const { StatusCodes } = require('http-status-codes');
const { describe } = require('jest-circus');

const TABLE_NAME = 'test';
const VALID_URL = 'http://example.com/';
const INVALID_METHOD = 'WIBBLE';

process.env.TABLE_NAME = TABLE_NAME;
process.env.ERROR_LOGGING_ENABLED = false;

const { handler, SUPPORTED_METHODS } = require('../urls-crud');

const createEvent = (httpMethod, baseUrl) => {
    return {
        httpMethod,
        pathParameters: {
            baseUrl
        }
    };
};

describe('input validation', () => {
    test.each([
        [
            'missing http method',
            createEvent(undefined, VALID_URL)
        ],
        [
            'invalid base URL parameter',
            createEvent(SUPPORTED_METHODS.GET, 'invalid base url')
        ],
        [
            'unsupported method',
            createEvent(INVALID_METHOD, VALID_URL)
        ]
    ])('returns bad request error given %s',
        async (message, input) => {
            const response = await handler(input);
            expect(response).toBeDefined();
            expect(response.body).toEqual('Event object failed validation');
            expect(response.headers).toEqual({
                'Content-Type': 'text/plain'
            });
            expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
        }
    );
});
