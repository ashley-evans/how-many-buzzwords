const middy = require('@middy/core');
const validator = require('@middy/validator');

const SEARCH_KEY = process.env.SEARCH_KEY;

const INPUT_SCHEMA = {
    type: 'object',
    required: ['Records'],
    properties: {
        Records: {
            type: 'array',
            items: {
                type: 'object',
                required: ['eventName', 'dynamodb'],
                properties: {
                    eventName: {
                        type: 'string'
                    },
                    dynamodb: {
                        type: 'object',
                        properties: {
                            NewImage: {
                                type: 'object',
                                required: [SEARCH_KEY],
                                properties: {
                                    [SEARCH_KEY]: {
                                        type: 'object',
                                        required: ['S'],
                                        properties: {
                                            S: {
                                                type: 'string'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
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
