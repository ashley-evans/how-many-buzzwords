const { handler } = require('../find-keywords');
const path = require('path');

const { mockURLFromFile } = require('../../../../../helpers/http-mock');

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

const createChildURL = (baseUrl, childRoute) => {
    return `${baseUrl}${childRoute}`;
};

const EXPECTED_BASE_URL = 'http://www.test.com';
const EXPECTED_CHILD_ROUTE = '/term-extraction';
const ASSET_FOLDER = path.join(__dirname, '/assets/');
const EXPECTED_CHILD_URL = createChildURL(EXPECTED_BASE_URL, EXPECTED_CHILD_ROUTE);

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

test.each([
    [
        'a single record',
        [
            {
                baseUrl: EXPECTED_BASE_URL,
                childRoute: EXPECTED_CHILD_ROUTE,
                assetPath: 'term-extraction.html'
            }
        ]
    ],
    [
        'multiple records',
        [
            {
                baseUrl: EXPECTED_BASE_URL,
                childRoute: EXPECTED_CHILD_ROUTE,
                assetPath: 'term-extraction.html'
            },
            {
                baseUrl: EXPECTED_BASE_URL,
                childRoute: '/empty',
                assetPath: 'empty.html'
            }
        ]
    ]
])('handler call expected url(s) given %s', async (message, routeDetails) => {
    const mockURLs = [];
    const records = [];
    for (let i = 0; i < routeDetails.length; i++) {
        const currentRouteDetails = routeDetails[i];
        const mockURL = mockURLFromFile(
            currentRouteDetails.baseUrl,
            currentRouteDetails.childRoute,
            path.join(ASSET_FOLDER, currentRouteDetails.assetPath),
            false
        );
        mockURLs.push(mockURL);

        const childURL = createChildURL(currentRouteDetails.baseUrl, currentRouteDetails.childRoute);
        records.push(createRecord(currentRouteDetails.baseUrl, childURL));
    }

    console.log(JSON.stringify(createEvent(...records)));
    await handler(createEvent(...records));

    for (let i = 0; i < mockURLs.length; i++) {
        expect(mockURLs[i].isDone()).toBeTruthy();
    }
});
