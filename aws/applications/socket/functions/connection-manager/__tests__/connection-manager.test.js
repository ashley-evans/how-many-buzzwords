const { handler } = require('../connection-manager');

const EXPECTED_CONNECTION_ID = 'Gyvd8cAwLPECHlQ=';
const EXPECTED_DOMAIN_NAME = 'test.test.com';
const EXPECTED_STAGE = 'test';
const CONNECTED_ROUTE_KEY = '$connect';

const createEvent = (connectionId, domainName, stage, routeKey) => {
    return {
        requestContext: {
            connectionId,
            domainName,
            stage,
            routeKey
        }
    };
};

describe('input validation', () => {
    test.each([
        ['event with missing requestContext', {}],
        ['event with non-object requestContext', { requestContext: '' }],
        [
            'requestContext with missing connectionId',
            createEvent(
                undefined,
                EXPECTED_DOMAIN_NAME,
                EXPECTED_STAGE,
                CONNECTED_ROUTE_KEY
            )
        ],
        [
            'requestContext with missing domainName',
            createEvent(
                EXPECTED_CONNECTION_ID,
                undefined,
                EXPECTED_STAGE,
                CONNECTED_ROUTE_KEY
            )
        ],
        [
            'requestContext with invalid domainName',
            createEvent(
                EXPECTED_CONNECTION_ID,
                'not a domain',
                EXPECTED_STAGE,
                CONNECTED_ROUTE_KEY
            )
        ],
        [
            'requestContext with missing stage',
            createEvent(
                EXPECTED_CONNECTION_ID,
                EXPECTED_DOMAIN_NAME,
                undefined,
                CONNECTED_ROUTE_KEY
            )
        ],
        [
            'requestContext with missing routeKey',
            createEvent(
                EXPECTED_CONNECTION_ID,
                EXPECTED_DOMAIN_NAME,
                EXPECTED_STAGE,
                undefined
            )
        ]
    ])('returns failed validation error given event with %s',
        async (message, input) => {
            await expect(handler(input)).rejects.toThrowError(
                'Event object failed validation'
            );
        }
    );
});
