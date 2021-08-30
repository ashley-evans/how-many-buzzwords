const { PutItemCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { StatusCodes } = require('http-status-codes');
const { TABLE_NAME } = require('./constants');

exports.handler = async (event) => {
    let responseCode = StatusCodes.OK;
    for (const record of event.Records) {
        const individualResponse = await putItem(record.body);

        if (individualResponse !== StatusCodes.OK) {
            responseCode = individualResponse;
        }
    }
    return formatResponse(responseCode);
};

const formatResponse = (statusCode) => {
    return {
        statusCode
    };
};

const putItem = async (itemToInsert) => {
    const ddbClient = new DynamoDBClient({});
    const params = {
        TableName: TABLE_NAME,
        Item: {
            pk: { S: itemToInsert }
        }
    };

    try {
        await ddbClient.send(new PutItemCommand(params));

        return StatusCodes.OK;
    } catch (error) {
        console.error(error);
        return StatusCodes.INTERNAL_SERVER_ERROR;
    }
};
