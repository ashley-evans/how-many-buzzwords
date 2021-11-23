const nock = require('nock');
const fs = require('fs-extra');

const mockURLFromFile = (urlMatcher, pathname, filePath, persist) => {
    if (!(urlMatcher instanceof RegExp) || typeof urlMatcher !== 'string') {
        throw new Error(`Provided urlMatcher value: ${urlMatcher} is not a ` +
            'Regular Expression or a String');
    }

    const mock = nock(urlMatcher)
        .get(pathname)
        .reply(
            200,
            readFile(filePath),
            {
                'content-type': 'text/html'
            }
        );

    if (persist) {
        mock.persist();
    }

    return mock;
};

const readFile = (filePath) => {
    return fs.readFileSync(filePath);
};

module.exports = {
    mockURLFromFile
};
