import { PathOrFileDescriptor, readFileSync } from "fs";
import nock, { ReplyHeaders } from "nock";
import { ParsedUrlQuery } from "querystring";
import { URLSearchParams } from "url";

function mockURLFromFile(
    urlMatcher: RegExp | URL,
    pathname: string,
    filePath: PathOrFileDescriptor,
    persist: boolean,
    statusCode = 200,
    queryParams?:
        | string
        | boolean
        | nock.DataMatcherMap
        | URLSearchParams
        | ((parsedObj: ParsedUrlQuery) => boolean),
    options?: nock.Options
) {
    const replyHeaders: ReplyHeaders = {
        "content-type": "text/html",
    };

    const matcher =
        urlMatcher instanceof RegExp ? urlMatcher : urlMatcher.toString();
    const mockInterceptor = queryParams
        ? nock(matcher, options).get(pathname).query(queryParams)
        : nock(matcher, options).get(pathname);

    const mockScope: nock.Scope =
        statusCode == 200
            ? mockInterceptor.reply(
                  statusCode,
                  readFileSync(filePath),
                  replyHeaders
              )
            : mockInterceptor.reply(statusCode);

    if (persist) {
        mockScope.persist();
    }

    return mockScope;
}

export { mockURLFromFile };
