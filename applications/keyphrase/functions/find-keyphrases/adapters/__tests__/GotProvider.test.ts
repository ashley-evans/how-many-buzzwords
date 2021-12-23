import { Scope } from "nock/types";
import path from "path";

import { mockURLFromFile } from "../../../../../../helpers/http-mock";

import GotProvider from "../GotProvider";

const EXAMPLE_VALID_URL = new URL('http://www.example.com');

const ASSET_FOLDER = path.join(__dirname, '/assets/');

describe('provider returns content from requested URL', () => {
    let siteMock: Scope;

    let response: string;

    beforeAll(async () => {
        siteMock = mockURLFromFile(
            EXAMPLE_VALID_URL,
            '/',
            path.join(ASSET_FOLDER, 'content.html'),
            false
        );

        const provider = new GotProvider();

        response = await provider.getBody(EXAMPLE_VALID_URL);
    });

    test('provider hits the requested URL once', () => {
        expect(siteMock.isDone()).toBe(true);
    });

    test('provider returns the body from the requested URL', () => {
        expect(response).toBeDefined();
        expect(response).toBe(
            '<!DOCTYPE html>\n' +
            '<html>\n' +
            '    <body>\n' +
            '        <p>Test Content</p>\n' +
            '    </body>\n' +
            '</html>\n');
    });
});
