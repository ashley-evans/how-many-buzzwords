const middy = require('@middy/core');
const validator = require('@middy/validator');

const INPUT_SCHEMA = {
    type: 'object',
    required: ['Records'],
    properties: {
        Records: {
            type: 'array',
            items: {
                type: 'object',
                required: ['dynamodb'],
                properties: {
                    dynamodb: {
                        type: 'object',
                        required: ['NewImage'],
                        properties: {
                            NewImage: {
                                type: 'object',
                                required: [
                                    'ConnectionEndpoint',
                                    'ConnectionId',
                                    'SearchKey'
                                ],
                                properties: {
                                    ConnectionEndpoint: {
                                        type: 'object',
                                        required: ['S'],
                                        properties: {
                                            S: {
                                                type: 'string',
                                                // eslint-disable-next-line max-len
                                                pattern: '(http(s)?:\\/\\/)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
                                            }
                                        }
                                    },
                                    ConnectionId: {
                                        type: 'object',
                                        required: ['S'],
                                        properties: {
                                            S: { type: 'string' }
                                        }
                                    },
                                    SearchKey: {
                                        type: 'object',
                                        required: ['S'],
                                        properties: {
                                            S: {
                                                type: 'string',
                                                // eslint-disable-next-line max-len
                                                pattern: process.env.SEARCH_KEY_PATTERN
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

const baseHandler = async (event) => {
    console.log(JSON.stringify(event));
};

const handler = middy(baseHandler)
    .use(validator({ inputSchema: INPUT_SCHEMA }));

module.exports = {
    handler
};
