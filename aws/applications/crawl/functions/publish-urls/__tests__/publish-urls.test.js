const { handler } = require('../publish-urls');

const createRecord = (baseUrl, childUrl) => {
    return {
        dynamodb: {
            NewImage: {
                ChildUrl: {
                    S: childUrl
                },
                BaseUrl: {
                    S: baseUrl
                }
            }
        },
        eventSource: 'aws:dynamodb'
    };
};

const createEvent = (...records) => {
    return {
        Records: records
    };
};

describe('input validation', () => {
    test.each([
        ['event with no records', {}],
        ['record with no DynamoDB field', createEvent({})],
        ['record with non-object DynamoDB field', createEvent({ dynamodb: 'test' })],
        ['record with missing NewImage field', createEvent({ dynamodb: {} })],
        ['record with non-object NewImage field', createEvent({ dynamodb: { Newimage: 'test' } })],
        ['record with missing BaseUrl field', createEvent({ dynamodb: { NewImage: { ChildUrl: {} } } })],
        ['record with non-object BaseUrl field', createEvent({ dynamodb: { NewImage: { BaseUrl: 'test', ChildUrl: {} } } })],
        ['record with missing ChildUrl field', createEvent({ dynamodb: { NewImage: { BaseUrl: {} } } })],
        ['record with non-object ChildUrl field', createEvent({ dynamodb: { NewImage: { BaseUrl: {}, ChildUrl: 'test' } } })],
        ['record with missing BaseUrl value', createEvent(createRecord(undefined, 'http://www.test.com/'))],
        ['record with missing ChildUrl value', createEvent(createRecord('http://www.test.com/', undefined))],
        ['record with invalid BaseUrl value', createEvent(createRecord('not a url', 'http://www.test.com/'))],
        ['record with invalid ChildUrl value', createEvent(createRecord('http://www.test.com/', 'not a url'))]
    ])('returns failed validation error given event with %s', async (message, input) => {
        await expect(handler(input)).rejects.toThrowError('Event object failed validation');
    });
});
