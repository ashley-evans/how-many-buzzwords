import { Scope } from "nock/types";
import path from "path";

import { mockURLFromFile } from "../../../../../../helpers/http-mock";

import GotProvider from "../GotProvider";

const EXAMPLE_VALID_HOSTNAME = "www.example.com";

const ASSET_FOLDER = path.join(__dirname, "/assets/");

const provider = new GotProvider();

describe.each(["http", "https"])(
    "provider handles URLs with %s protocol",
    (protocol) => {
        let siteMock: Scope;

        let response: string;

        beforeAll(async () => {
            const url = new URL(`${protocol}://${EXAMPLE_VALID_HOSTNAME}`);
            siteMock = mockURLFromFile(
                url,
                "/",
                path.join(ASSET_FOLDER, "text.html"),
                false
            );

            response = await provider.getBody(url);
        });

        test("provider hits the requested URL once", () => {
            expect(siteMock.isDone()).toBe(true);
        });

        test("provider returns the body from the requested URL", () => {
            expect(response).toBeDefined();
            expect(response).toBe(
                "<!DOCTYPE html>\n" +
                    "<html>\n" +
                    "    <body>\n" +
                    "        <p>Test Text</p>\n" +
                    "    </body>\n" +
                    "</html>\n"
            );
        });
    }
);
