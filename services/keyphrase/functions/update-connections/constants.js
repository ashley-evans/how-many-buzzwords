const dynamoDBEventTypes = Object.freeze({
    INSERT_EVENT_NAME: "INSERT",
    MODIFY_EVENT_NAME: "MODIFY",
    REMOVE_EVENT_NAME: "REMOVE",
});

const apiGatewayExceptionMessages = Object.freeze({
    GONE_EXCEPTION: "GoneException",
});

const activeConnectionsTableKeyFields = Object.freeze({
    PRIMARY_INDEX_HASH: "ConnectionId",
    SECONDARY_INDEX_HASH: "SearchKey",
});

module.exports = Object.freeze({
    dynamoDBEventTypes,
    apiGatewayExceptionMessages,
    activeConnectionsTableKeyFields,
});
