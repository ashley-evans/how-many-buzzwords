import KeyphrasesError from "../KeyphrasesError";

test("returns keyphrases error as name of error", () => {
    const error = new KeyphrasesError();

    expect(error.name).toEqual("KeyphrasesError");
});

test("sets error message to provided message", () => {
    const expectedMessage = "Test";

    const error = new KeyphrasesError(expectedMessage);

    expect(error.message).toEqual(expectedMessage);
});
