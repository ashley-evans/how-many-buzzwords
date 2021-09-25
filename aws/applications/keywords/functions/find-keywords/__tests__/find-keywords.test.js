const { handler } = require('../find-keywords');

const EXPECTED_BASE_URL = 'http://www.test.com/';
const EXPECTED_CHILD_URL = 'http://www.test.com/test';

const createEvent = (...records) => {
    return {
        Records: records
    };
};
const createRecord = (baseUrl, childUrl) => {
    return {
        body: JSON.stringify({ baseUrl, childUrl }),
        eventSource: 'aws:sqs'
    };
};

describe('input validation', () => {
    test.each([
        ['event with no records', {}],
        ['record with missing body', createEvent({})],
        ['record with non-object body', createEvent({ body: 'test' })],
        ['record with missing BaseUrl value', createEvent(createRecord(undefined, EXPECTED_CHILD_URL))],
        ['record with missing ChildUrl value', createEvent(createRecord(EXPECTED_BASE_URL, undefined))],
        ['record with invalid BaseUrl value', createEvent(createRecord('not a url', EXPECTED_CHILD_URL))],
        ['record with invalid ChildUrl value', createEvent(createRecord(EXPECTED_BASE_URL, 'not a url'))]
    ])('returns failed validation error given event with %s', async (message, input) => {
        await expect(handler(input)).rejects.toThrowError('Event object failed validation');
    });
});
