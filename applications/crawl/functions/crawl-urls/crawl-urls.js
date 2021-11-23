const Apify = require('apify');
const { StatusCodes } = require('http-status-codes');
const { PutItemCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');

const middy = require('@middy/core');
const sqsJsonBodyHandler = require('@middy/sqs-json-body-parser');
const httpErrorHandler = require('@middy/http-error-handler');
const validator = require('@middy/validator');

const { urlsTableKeyFields } = require('./constants');

let requestQueue;
const ddbClient = new DynamoDBClient({});

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
                        required: ['url'],
                        properties: {
                            url: {
                                type: 'string',
                                // eslint-disable-next-line max-len
                                pattern: '(http(s)?:\\/\\/)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
                            },
                            depth: { type: 'integer' }
                        }
                    }
                }
            }
        }
    }
};

const baseHandler = async (event) => {
    const requestList = await Apify.openRequestList(
        null,
        event.Records.map(record => {
            const { url, depth } = record.body;
            return {
                url: url,
                userData: {
                    maxCrawlDepth: depth
                }
            };
        })
    );
    requestQueue = await Apify.openRequestQueue();

    const maxRequestsPerCrawl = parseInt(process.env.MAX_REQUESTS_PER_CRAWL) *
        event.Records.length;
    const crawler = new Apify.CheerioCrawler({
        requestList,
        requestQueue,
        handlePageFunction: crawlPage,
        preNavigationHooks: [
            async (crawlingContext, requestAsBrowserOptions) => {
                requestAsBrowserOptions.http2 = false;
            }
        ],
        maxRequestsPerCrawl
    });

    await crawler.run();
    await requestQueue.drop();
    return formatResponse(StatusCodes.OK);
};

const crawlPage = async ({ request, $ }) => {
    console.log(`Visiting ${request.url}`);

    const userData = request.userData;
    const maximumDepthEnv = parseInt(process.env.MAX_CRAWL_DEPTH);
    const currentDepth = userData.depth ? userData.depth : 0;
    const maxCrawlDepth = userData.maxCrawlDepth < maximumDepthEnv
        ? userData.maxCrawlDepth
        : maximumDepthEnv;
    const baseUrl = userData.baseUrl ? userData.baseUrl : request.url;

    if (currentDepth < maxCrawlDepth) {
        const baseUrlHostName = (new URL(baseUrl).hostname).replace('www.', '');

        await Apify.utils.enqueueLinks({
            $,
            requestQueue,
            baseUrl: request.loadedUrl,
            transformRequestFunction: request => {
                request.userData.baseUrl = baseUrl;
                request.userData.depth = currentDepth + 1;
                request.userData.maxCrawlDepth = maxCrawlDepth;
                return request;
            },
            pseudoUrls: [
                new Apify.PseudoUrl(
                    new RegExp(
                        `(^|\\s)https?://(www.)?${baseUrlHostName}([-a-zA-Z0-9(
                        )@:%_+.~#?&//=]*)`
                    )
                )
            ]
        });
    }

    await putItem(baseUrl, new URL(request.url).pathname);
};

const putItem = async (hashKeyValue, sortKeyValue) => {
    const params = {
        TableName: process.env.TABLE_NAME,
        Item: {
            [urlsTableKeyFields.HASH_KEY]: { S: hashKeyValue },
            [urlsTableKeyFields.SORT_KEY]: { S: sortKeyValue }
        }
    };

    await ddbClient.send(new PutItemCommand(params));
};

const formatResponse = (statusCode) => {
    return {
        statusCode
    };
};

const handler = middy(baseHandler)
    .use(sqsJsonBodyHandler())
    .use(validator({ inputSchema: INPUT_SCHEMA }))
    .use(
        httpErrorHandler(
            process.env.ERROR_LOGGING_ENABLED === 'false'
                ? { logger: false }
                : undefined
        )
    );

module.exports = {
    handler
};
