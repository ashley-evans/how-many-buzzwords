import RegexCounter from "../RegexCounter";

const counter = new RegexCounter();

test('returns zero if no text is provided', () => {
    const result = counter.countOccurrences('', 'test');

    expect(result).toBe(result);
});

test('returns zero if no matcher is provided', () => {
    const result = counter.countOccurrences('text text', '');

    expect(result).toBe(0);
});

test.each([
    [
        0,
        'no matches',
        'example text',
        'wibble'
    ],
    [
        0,
        'no whole word matches',
        'exampletext',
        'text'
    ],
    [
        1,
        'a single match',
        'example text',
        'text'
    ],
    [
        2,
        'multiple matches',
        'example text example text',
        'text'
    ]
])('returns %i given %s', (
    expectedMatches: number,
    message: string,
    text: string,
    match: string
) => {
    const result = counter.countOccurrences(text, match);

    expect(result).toBe(expectedMatches);
});

test('escapes regular expression characters in match text', () => {
    const wildcardMatch = '.*';

    const result = counter.countOccurrences('test', wildcardMatch);

    expect(result).toBe(0);
});
