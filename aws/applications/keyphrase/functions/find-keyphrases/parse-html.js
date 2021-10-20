const htmlparser = require('htmlparser2');

const shouldSkip = (tag) => {
    switch (tag) {
        case 'script':
        case 'style':
            return true;
    }

    return false;
};

const getAllTextInHTML = (html) => {
    let result = '';
    let skipText = false;
    const parser = new htmlparser.Parser({
        onopentag (name) {
            skipText = shouldSkip(name);
        },
        ontext (text) {
            if (!skipText) {
                result = `${result} ${text}`.trim();
            }
        },
        onclosetag () {
            skipText = false;
        }
    });

    parser.write(html);
    parser.end();
    return result.replace(/\n|\r/g, '').trim();
};

module.exports = {
    getAllTextInHTML
};
