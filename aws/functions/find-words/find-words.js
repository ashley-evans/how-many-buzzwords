const Apify = require('apify');
const { StatusCodes } = require('http-status-codes');
const { PutItemCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');

let requestQueue;
const ddbClient = new DynamoDBClient({});

exports.handler = async (event) => {
    const requestList = await Apify.openRequestList(
        null,
        event.Records.map(record => record.body)
    );
    requestQueue = await Apify.openRequestQueue();

    event.Records.map(async record => await requestQueue.addRequest({ url: record.body }));

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

    const baseUrl = request.userData.baseUrl ? request.userData.baseUrl : request.url;
    const currentDepth = request.userData.depth ? request.userData.depth : 0;

    if (currentDepth < process.env.maxCrawlDepth) {
        await Apify.utils.enqueueLinks({
            $,
            requestQueue,
            baseUrl: request.loadedUrl,
            transformRequestFunction: request => {
                request.userData.baseUrl = baseUrl;
                request.userData.depth = currentDepth + 1;
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
