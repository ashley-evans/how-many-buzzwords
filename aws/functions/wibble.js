exports.handler = async function (event, context) {
    return formatResponse(JSON.stringify('wibble'));
};

const formatResponse = function (body) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body
    };
};
