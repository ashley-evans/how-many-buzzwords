const middy = require('@middy/core');
const validator = require('@middy/validator');
const httpErrorHandler = require('@middy/http-error-handler');

const SUPPORTED_METHODS = Object.freeze({
    GET: 'GET'
});

const INPUT_SCHEMA = {
    type: 'object',
    required: ['httpMethod'],
    properties: {
        httpMethod: {
            type: 'string',
            enum: Object.values(SUPPORTED_METHODS)
        },
        pathParameters: {
            type: 'object',
            required: ['baseUrl'],
            properties: {
                baseUrl: {
                    type: 'string',
                    // eslint-disable-next-line max-len
                    pattern: '(http(s)?:\\/\\/)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
                }
            }
        }
    }
};

const baseHandler = (event) => {
    console.log(JSON.stringify(event));
};

const handler = middy(baseHandler)
    .use(validator({ inputSchema: INPUT_SCHEMA }))
    .use(
        httpErrorHandler(
            process.env.ERROR_LOGGING_ENABLED === 'false'
                ? { logger: false }
                : undefined
        )
    );

module.exports = {
    handler,
    SUPPORTED_METHODS
};
