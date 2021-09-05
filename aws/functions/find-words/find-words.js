const Apify = require('apify');
const { StatusCodes } = require('http-status-codes');

const processed = [];
let requestQueue;

exports.handler = async (event) => {
    requestQueue = await Apify.openRequestQueue();
    event.Records.map(async record => await requestQueue.addRequest({ url: record.body }));

    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction: crawlPage
    });

    await crawler.run();

    return formatResponse(StatusCodes.OK);
};

const crawlPage = async ({ request, $ }) => {
    console.log(`Visiting ${request.url}`);

    await Apify.utils.enqueueLinks({
        $,
        requestQueue,
        baseUrl: request.loadedUrl
    });

    processed.push({ url: request.url });
};

const formatResponse = (statusCode) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(processed)
    };
};
