const Apify = require('apify');
const { StatusCodes } = require('http-status-codes');
const { PutItemCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');

let requestQueue;
const ddbClient = new DynamoDBClient({});

exports.handler = async (event) => {
    const requestList = await Apify.openRequestList(
        null,
        event.Records.map(record => {
            const body = JSON.parse(record.body);
            return {
                url: body.url,
                userData: {
                    maxCrawlDepth: body.depth
                }
            };
        })
    );
    requestQueue = await Apify.openRequestQueue();

    const crawler = new Apify.CheerioCrawler({
        requestList,
        requestQueue,
        handlePageFunction: crawlPage
    });

    await crawler.run();
    await requestQueue.drop();
    return formatResponse(StatusCodes.OK);
};

const crawlPage = async ({ request, $ }) => {
    console.log(`Visiting ${request.url}`);

    const userData = request.userData;
    const maximumDepthEnv = parseInt(process.env.maxCrawlDepth);
    const baseUrl = userData.baseUrl ? userData.baseUrl : request.url;
    const currentDepth = userData.depth ? userData.depth : 0;
    const maxCrawlDepth = userData.maxCrawlDepth < maximumDepthEnv ? userData.maxCrawlDepth : maximumDepthEnv;

    if (currentDepth < maxCrawlDepth) {
        await Apify.utils.enqueueLinks({
            $,
            requestQueue,
            baseUrl: request.loadedUrl,
            transformRequestFunction: request => {
                request.userData.baseUrl = baseUrl;
                request.userData.depth = currentDepth + 1;
                request.userData.maxCrawlDepth = maxCrawlDepth;
                return request;
            }
        });
    }

    await putChildPage(baseUrl, request.url);
};

const putChildPage = async (base, child) => {
    const params = {
        TableName: process.env.tableName,
        Item: {
            BaseUrl: { S: base },
            ChildUrl: { S: child }
        }
    };

    await ddbClient.send(new PutItemCommand(params));
};

const formatResponse = (statusCode) => {
    return {
        statusCode
    };
};
