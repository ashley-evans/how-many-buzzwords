const { PutItemCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { StatusCodes } = require('http-status-codes');

exports.handler = async () => {
    return putItem(`wibble-${Date.now()}`);
};

const formatResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body
    };
};

const putItem = async (itemToInsert) => {
    const ddbClient = new DynamoDBClient({});
    const params = {
        TableName: 'WibbleTable',
        Item: {
            pk: { S: itemToInsert }
        }
    };

    try {
        await ddbClient.send(new PutItemCommand(params));

        return formatResponse(StatusCodes.OK, 'Insert Success');
    } catch (error) {
        console.error(error);
        return formatResponse(StatusCodes.INTERNAL_SERVER_ERROR, JSON.stringify(error));
    }
};
