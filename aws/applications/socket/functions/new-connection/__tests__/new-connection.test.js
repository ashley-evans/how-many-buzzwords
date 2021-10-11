const EXPECTED_CONNECTION_ENDPOINT = 'https://test.test.com/prod';
const EXPECTED_CONNECTION_ID = 'Gyvd8cAwLPECHlQ=';
const EXPECTED_SEARCH_KEY = 'valid_key';

process.env.SEARCH_KEY_PATTERN = EXPECTED_SEARCH_KEY;

const { handler } = require('../new-connection');

const createEvent = (...records) => {
    return {
        Records: records
    };
};

const createRecord = (connectionEndpoint, connectionId, searchKey) => {
    return {
        dynamodb: {
            NewImage: {
                ConnectionEndpoint: { S: connectionEndpoint },
                ConnectionId: { S: connectionId },
                SearchKey: { S: searchKey }
            }
        }
    };
};

describe('input validation', () => {
    test.each([
        ['event with missing records', { Records: undefined }],
        [
            'record with missing dynamoDB field',
            createEvent({ dynamodb: undefined })
        ],
        [
            'record with missing NewImage field',
            createEvent({ dynamodb: { NewImage: undefined } })
        ],
        [
            'record with missing connection endpoint',
            createEvent(createRecord())
        ],
        [
            'record with invalid connection endpoint',
            createEvent(createRecord('not a url'))
        ],
        [
            'record with missing connection id',
            createEvent(createRecord(EXPECTED_CONNECTION_ENDPOINT))
        ],
        [
            'record with missing search key',
            createEvent(
                createRecord(
                    EXPECTED_CONNECTION_ENDPOINT,
                    EXPECTED_CONNECTION_ID
                )
            )
        ],
        [
            'record with invalid search key',
            createEvent(
                createRecord(
                    EXPECTED_CONNECTION_ENDPOINT,
                    EXPECTED_CONNECTION_ID,
                    'invalid search key'
                )
            )
        ]
    ])(
        'returns failed validation error given %s',
        async (message, event) => {
            await expect(handler(event)).rejects.toThrowError(
                'Event object failed validation'
            );
        }
    );
});
