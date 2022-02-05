import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from 'aws-lambda';

import GetURLsAdapter from '../GetURLsAdapter';

const VALID_URL = new URL('http://www.example.com');

const adapter = new GetURLsAdapter();

function createEvent(baseURL?: URL | string): APIGatewayProxyEvent {
    const event = mock<APIGatewayProxyEvent>();
    if (baseURL) {
        event.pathParameters = {
            baseURL: baseURL.toString()
        };
    }

    return event;
}

test.each([
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
])(
    'throws exception given %s',
    async (message: string, event: APIGatewayProxyEvent) => {
        expect.assertions(1);
        await expect(
            adapter.handleRequest(event)
        ).rejects.toEqual(
            expect.objectContaining({
                message: expect.stringContaining(
                    'Exception occured during event validation:'
                )
            })
        );
    }
);
