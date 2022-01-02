const middy = require('@middy/core');
const validator = require('@middy/validator');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const { URLsTableKeyFields } = require('buzzword-aws-crawl-common');

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
                                    URLsTableKeyFields.HashKey,
                                    URLsTableKeyFields.SortKey
                                ],
                                properties: {
                                    [URLsTableKeyFields.HashKey]: {
                                        type: 'object',
                                        required: ['S'],
                                        properties: {
                                            S: {
                                                type: 'string',
                                                // eslint-disable-next-line max-len
                                                pattern: '^(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)$'
                                            }
                                        }
                                    },
                                    [URLsTableKeyFields.SortKey]: {
                                        type: 'object',
                                        required: ['S'],
                                        properties: {
                                            S: {
                                                type: 'string',
                                                pattern: '^/.*$'
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

const client = new SNSClient({});

const baseHandler = async (event) => {
    const records = event.Records;
    for (let i = 0; i < records.length; i++) {
        const recordNewImage = records[i].dynamodb.NewImage;
        const hashKeyValue = recordNewImage[URLsTableKeyFields.HashKey].S;
        const sortKeyValue = recordNewImage[URLsTableKeyFields.SortKey].S;
        await publishMessage(hashKeyValue, sortKeyValue);
    }
};

const publishMessage = async (hashKeyValue, sortKeyValue) => {
    const publishParams = {
        Message: JSON.stringify({
            [URLsTableKeyFields.HashKey]: hashKeyValue,
            [URLsTableKeyFields.SortKey]: sortKeyValue
        }),
        TargetArn: process.env.TARGET_SNS_ARN
    };

    const command = new PublishCommand(publishParams);
    try {
        await client.send(command);
    } catch (ex) {
        console.error(JSON.stringify(ex));
    }
};

const handler = middy(baseHandler)
    .use(validator({ inputSchema: INPUT_SCHEMA }));

module.exports = {
    handler
};
