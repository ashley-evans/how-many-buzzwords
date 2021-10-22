const fs = require('fs-extra');
const path = require('path');

const { getAllTextInHTML } = require('../parse-html');

const ASSET_FOLDER = path.join(__dirname, '/assets/');

const readFile = (filePath) => {
    return fs.readFileSync(filePath).toString();
};

test('returns all text in HTML given HTML with no tag in body', () => {
    const html = readFile(path.join(ASSET_FOLDER, 'only-body.html'));

    const result = getAllTextInHTML(html);

    expect(result).toEqual(
        'Test 1 Test 2 Test 3'
    );
});

test('returns no text given HTML with no text', () => {
    const html = readFile(path.join(ASSET_FOLDER, 'empty.html'));

    const result = getAllTextInHTML(html);

    expect(result).toEqual('');
});

test.each([
    ['script', 'script.html'],
    ['style', 'style.html'],
    ['comment', 'comment.html']
])('returns all text outside of %s tags', (tagType, fileName) => {
    const html = readFile(path.join(ASSET_FOLDER, fileName));

    const result = getAllTextInHTML(html);

    expect(result).toEqual('This is actual text!');
});
