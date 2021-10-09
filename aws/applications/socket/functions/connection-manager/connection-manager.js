const middy = require('@middy/core');
const validator = require('@middy/validator');

const INPUT_SCHEMA = {
    type: 'object',
    required: ['requestContext'],
    properties: {
        requestContext: {
            type: 'object',
            required: ['connectionId', 'domainName', 'stage', 'routeKey'],
            properties: {
                connectionId: {
                    type: 'string'
                },
                domainName: {
                    type: 'string',
                    // eslint-disable-next-line max-len
                    pattern: '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$'
                },
                stage: {
                    type: 'string'
                },
                routeKey: {
                    type: 'string'
                }
            }
        }
    }
};

const baseHandler = (event) => {
    console.log(JSON.stringify(event));
};

const handler = middy(baseHandler)
    .use(validator({ inputSchema: INPUT_SCHEMA }));

module.exports = {
    handler
};
