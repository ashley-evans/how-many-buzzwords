const middy = require('@middy/core');
const sqsJsonBodyHandler = require('@middy/sqs-json-body-parser');
const validator = require('@middy/validator');
const fetch = require('node-fetch');

const INPUT_SCHEMA = {
    type: 'object',
    required: ['Records'],
    properties: {
        Records: {
            type: 'array',
            items: {
                type: 'object',
                required: ['body'],
                properties: {
                    body: {
                        type: 'object',
                        required: ['baseUrl', 'childUrl'],
                        properties: {
                            baseUrl: {
                                type: 'string',
                                pattern: '(http(s)?:\\/\\/.)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
                            },
                            childUrl: {
                                type: 'string',
                                pattern: '(http(s)?:\\/\\/.)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
                            }
                        }
                    }
                }
            }
        }
    }
};

const baseHandler = async (event) => {
    for (let i = 0; i < event.Records.length; i++) {
        const { baseUrl, childUrl } = event.Records[i].body;
        await fetch(childUrl);
    }
};

const handler = middy(baseHandler)
    .use(sqsJsonBodyHandler())
    .use(validator({ inputSchema: INPUT_SCHEMA }));

module.exports = {
    handler
};
