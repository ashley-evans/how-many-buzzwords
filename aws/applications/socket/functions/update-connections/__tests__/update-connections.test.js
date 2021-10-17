const {
    INSERT_EVENT_NAME
} = require('../../constants');

const TABLE_NAME = 'test';
const SEARCH_KEY = 'BaseUrl';

process.env.TABLE_NAME = TABLE_NAME;
process.env.SEARCH_KEY = SEARCH_KEY;

const { handler } = require('../update-connections');

const createEvent = (...records) => {
    return {
        Records: records
    };
};

const createRecord = (
    eventName,
    searchKey
) => {
    return {
        eventName,
        dynamodb: {
            NewImage: {
                [SEARCH_KEY]: { S: searchKey }
            }
        }
    };
};

describe('input validation', () => {
    test.each([
        ['event with missing records', { Records: undefined }],
        [
            'record with missing dynamoDB field',
            createEvent({ dynamodb: undefined, eventName: INSERT_EVENT_NAME })
        ],
        [
            'record with missing search key field',
            createEvent(
                createRecord(
                    INSERT_EVENT_NAME
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
