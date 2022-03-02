const middy = require("@middy/core");
const validator = require("@middy/validator");
const {
    EventBridgeClient,
    PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");

const { URLsTableKeyFields } = require("buzzword-aws-crawl-common");

const INPUT_SCHEMA = {
    type: "object",
    required: ["Records"],
    properties: {
        Records: {
            type: "array",
            items: {
                type: "object",
                required: ["dynamodb"],
                properties: {
                    dynamodb: {
                        type: "object",
                        required: ["NewImage"],
                        properties: {
                            NewImage: {
                                type: "object",
                                required: [
                                    URLsTableKeyFields.HashKey,
                                    URLsTableKeyFields.SortKey,
                                ],
                                properties: {
                                    [URLsTableKeyFields.HashKey]: {
                                        type: "object",
                                        required: ["S"],
                                        properties: {
                                            S: {
                                                type: "string",
                                                // eslint-disable-next-line max-len
                                                pattern:
                                                    "^(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)$",
                                            },
                                        },
                                    },
                                    [URLsTableKeyFields.SortKey]: {
                                        type: "object",
                                        required: ["S"],
                                        properties: {
                                            S: {
                                                type: "string",
                                                pattern: "^/.*$",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

const client = new EventBridgeClient({});

const baseHandler = async (event) => {
    const records = event.Records;
    const entries = records.map((record) => {
        const newImage = record?.dynamodb?.NewImage;
        if (newImage) {
            return createEntry(
                newImage[URLsTableKeyFields.HashKey].S,
                newImage[URLsTableKeyFields.SortKey].S
            );
        }
    });

    publishEvent(entries);
};

const createEntry = (baseURL, pathname) => {
    return {
        EventBusName: process.env.EVENT_BUS_ARN,
        Source: "crawl.aws.buzzword",
        DetailType: "New URL Crawled via Crawl Service",
        Detail: JSON.stringify({
            baseURL,
            pathname,
        }),
    };
};

const publishEvent = async (entries) => {
    if (entries?.length == 0) {
        return;
    }

    const input = {
        Entries: entries,
    };
    const command = new PutEventsCommand(input);

    client.send(command);
};

const handler = middy(baseHandler).use(
    validator({ inputSchema: INPUT_SCHEMA })
);

module.exports = {
    handler,
};
