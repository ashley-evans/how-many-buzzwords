const { handler } = require('../connection-manager');

const EXPECTED_CONNECTION_ID = 'Gyvd8cAwLPECHlQ=';
const EXPECTED_DOMAIN_NAME = 'test.test.com';

const createEvent = (connectionId, domainName, stage) => {
    return {
        requestContext: {
            connectionId,
            domainName,
            stage
        }
    };
};

describe('input validation', () => {
    test.each([
        ['event with missing requestContext', {}],
        ['event with non-object requestContext', { requestContext: '' }],
        ['requestContext with missing connectionId', createEvent()],
        ['requestContext with missing domainName', createEvent(EXPECTED_CONNECTION_ID)],
        ['requestContext with invalid domainName', createEvent(EXPECTED_CONNECTION_ID, 'not a domain')],
        ['requestContext with missing stage', createEvent(EXPECTED_CONNECTION_ID, EXPECTED_DOMAIN_NAME)]
    ])('returns failed validation error given event with %s', async (message, input) => {
        await expect(handler(input)).rejects.toThrowError('Event object failed validation');
    });
});
