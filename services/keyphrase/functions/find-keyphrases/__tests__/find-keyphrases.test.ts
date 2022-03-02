import { mock } from "jest-mock-extended";

import { handler } from "../find-keyphrases";
import { KeyphrasesEvent } from "../ports/KeyphrasePrimaryAdapter";

const mockEvent = mock<KeyphrasesEvent>();

test("throws error if table name is undefined", async () => {
    delete process.env.TABLE_NAME;

    await expect(handler(mockEvent)).rejects.toThrow(
        new Error("Keyphrases Table Name has not been set.")
    );
});
