const nock = require('nock');
const fs = require('fs-extra');

const mockURLFromFile = (domainName, uri, filePath, persist) => {
    const mock = nock(domainName)
        .get(uri)
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
