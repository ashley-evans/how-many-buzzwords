import { PathOrFileDescriptor, readFileSync } from "fs";
import nock, { ReplyHeaders} from "nock";
import { Url } from "url";

function mockURLFromFile(
    urlMatcher: RegExp | Url,
    pathname: string,
    filePath: PathOrFileDescriptor,
    persist: boolean
) {
    const replyHeaders: ReplyHeaders = {
        'content-type': 'text/html'
    };

    const mock = nock(urlMatcher)
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
