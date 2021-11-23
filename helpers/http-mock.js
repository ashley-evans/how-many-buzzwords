const nock = require('nock');
const fs = require('fs-extra');
const escapeRegExp = require('lodash.escaperegexp');

const mockURLFromFile = (urlText, pathname, filePath, persist) => {
    const mock = nock(new RegExp(escapeRegExp(urlText)))
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
