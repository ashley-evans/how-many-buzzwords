import { PathOrFileDescriptor, readFileSync } from "fs";
import nock, { ReplyHeaders} from "nock";

function mockURLFromFile(
    urlMatcher: RegExp | URL,
    pathname: string,
    filePath: PathOrFileDescriptor,
    persist: boolean
) {
    const replyHeaders: ReplyHeaders = {
        'content-type': 'text/html'
    };

    const matcher = urlMatcher instanceof RegExp 
        ? urlMatcher 
        : urlMatcher.toString();
    const mock = nock(matcher)
        .get(pathname)
        .reply(
            200,
            readFileSync(filePath),
            replyHeaders
        );

    if (persist) {
        mock.persist();
    }

    return mock;
}

export {
    mockURLFromFile
};
