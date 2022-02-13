import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

import GetURLsAdapter from '../GetURLsAdapter';
import { PathnameResponse, GetURLsPort } from "../../ports/GetURLsPort";

const VALID_URL = new URL('http://www.example.com');

const mockPort = mock<GetURLsPort>();
const adapter = new GetURLsAdapter(mockPort);

function createEvent(baseURL?: URL | string): APIGatewayProxyEvent {
    const event = mock<APIGatewayProxyEvent>();
    if (baseURL) {
        event.pathParameters = {
            baseURL: baseURL.toString()
        };
    }

    return event;
}

function createPathname(pathname: string): PathnameResponse {
    return {
        pathname,
        crawledAt: new Date()
    };
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe.each([
    [
        'missing url in query string',
        createEvent()
    ],
    [
        'invalid url (numeric)',
        createEvent('1')
    ],
    [
        'invalid url',
        createEvent(`test ${VALID_URL.toString()}`)
    ]
])('given an event with %s', (message: string, event: APIGatewayProxyEvent) => {
    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();

        response = await adapter.handleRequest(event);
    });

    test('does not call port with invalid event', () => {
        expect(mockPort.getPathnames).toHaveBeenCalledTimes(0);
    });

    test('returns plain text mime type in content type header', () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                'Content-Type': 'text/plain'
            })
        );
    });

    test('returns 500 response', () => {
        expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    test('returns error in response body', () => {
        expect(response.body).toEqual('Invalid event');
    });
});

describe.each([
    [
        'url with protocol',
        createEvent(VALID_URL)
    ],
    [
        'url without protocol',
        createEvent(VALID_URL.hostname)
    ]
])(
    'given a valid event with a %s that has been crawled recently',
    (message: string, event: APIGatewayProxyEvent) => {
        const expectedPathnames = [
            createPathname('/wibble'),
            createPathname('/wobble')
        ];
        let response: APIGatewayProxyResult;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockPort.getPathnames.mockResolvedValue(expectedPathnames);

            response = await adapter.handleRequest(event);
        });

        test('calls port with URL from event', () => {
            expect(mockPort.getPathnames).toHaveBeenCalledTimes(1);
            expect(mockPort.getPathnames).toHaveBeenCalledWith(VALID_URL);
        });

        test('returns 200 response', () => {
            expect(response.statusCode).toEqual(StatusCodes.OK);
        });

        test('returns JSON mime type in content type header', () => {
            expect(response.headers).toEqual(
                expect.objectContaining({
                    'Content-Type': 'application/json'
                })
            );
        });

        test('returns valid JSON in response body', () => {
            expect(() => JSON.parse(response.body)).not.toThrow();
        });

        test('returns provided URL\'s hostname in response body', () => {
            const body = JSON.parse(response.body);
            expect(body.baseURL).toEqual(VALID_URL.hostname);
        });

        test(
            'returns an array of each crawled pathname in response body',
            () => {
                expect(
                    Array.isArray(JSON.parse(response.body).pathnames)
                ).toBe(true);
            }
        );

        test('returns each expected pathname in response body', () => {
            const body = JSON.parse(response.body);
            for (const pathnames of expectedPathnames) {
                expect(body.pathnames).toContainEqual(
                    expect.objectContaining({
                        pathname: pathnames.pathname
                    })
                );
            }
        });

        test('returns crawl date for each pathname in response body', () => {
            const body = JSON.parse(response.body);
            for (const pathname of body.pathnames) {
                const convertedDate = new Date(pathname.crawledAt);
                expect(convertedDate).not.toEqual(NaN);
                expect(expectedPathnames).toContainEqual(
                    expect.objectContaining({
                        crawledAt: convertedDate
                    })
                );
            }
        });
    }
);

describe.each([
    [
        'url with protocol',
        createEvent(VALID_URL)
    ],
    [
        'url without protocol',
        createEvent(VALID_URL.hostname)
    ]
])(
    'given a valid event with a %s that hasn\'t been crawled recently',
    (message: string, event: APIGatewayProxyEvent) => {
        let response: APIGatewayProxyResult;

        beforeAll(async () => {
            jest.resetAllMocks();
            mockPort.getPathnames.mockResolvedValue([]);

            response = await adapter.handleRequest(event);
        });

        test('calls port with URL from event', () => {
            expect(mockPort.getPathnames).toHaveBeenCalledTimes(1);
            expect(mockPort.getPathnames).toHaveBeenCalledWith(VALID_URL);
        });

        test('returns plain text mime type in content type header', () => {
            expect(response.headers).toEqual(
                expect.objectContaining({
                    'Content-Type': 'text/plain'
                })
            );
        });

        test('returns 404 response', () => {
            expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
        });

        test('returns not crawled message in body', () => {
            expect(response.body).toEqual(
                'URL provided has not been crawled recently.'
            );
        });
    }
);

describe('given port rejects promise', () => {
    const expectedError = new Error('Test Error');
    let response: APIGatewayProxyResult;

    beforeAll(async () => {
        jest.resetAllMocks();
        mockPort.getPathnames.mockRejectedValue(expectedError);

        response = await adapter.handleRequest(
            createEvent(VALID_URL)
        );
    });

    test('calls port with URL from event', () => {
        expect(mockPort.getPathnames).toHaveBeenCalledTimes(1);
        expect(mockPort.getPathnames).toHaveBeenCalledWith(VALID_URL);
    });

    test('returns plain text mime type in content type header', () => {
        expect(response.headers).toEqual(
            expect.objectContaining({
                'Content-Type': 'text/plain'
            })
        );
    });

    test('returns 500 response', () => {
        expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    test('returns error in response body', () => {
        expect(response.body).toContain('Error occurred during GET');
    });
});
