import CrawlError from "../CrawlError";

test('returns crawl error as name of error', () => {
    const error = new CrawlError();

    expect(error.name).toEqual('CrawlError');
});

test('sets error message to provided message', () => {
    const expectedMessage = 'Test';

    const error = new CrawlError(expectedMessage);

    expect(error.message).toEqual(expectedMessage);
});
