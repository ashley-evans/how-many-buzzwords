const middy = require('@middy/core');
const validator = require('@middy/validator');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

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
                                required: ['BaseUrl', 'ChildUrl'],
                                properties: {
                                    BaseUrl: {
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
                                    ChildUrl: {
                                        type: 'object',
                                        required: ['S'],
                                        properties: {
                                            S: {
                                                type: 'string',
                                                // eslint-disable-next-line max-len
                                                pattern: '(http(s)?:\\/\\/)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
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
        const baseUrl = recordNewImage.BaseUrl.S;
        const childUrl = recordNewImage.ChildUrl.S;
        await publishMessage(baseUrl, childUrl);
    }
};

const publishMessage = async (baseUrl, childUrl) => {
    const publishParams = {
        Message: JSON.stringify({ baseUrl, childUrl }),
        TargetArn: process.env.targetSNSArn
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
