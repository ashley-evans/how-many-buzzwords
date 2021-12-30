import { KeyphraseResponse } from '../../ports/KeyphraseProvider';

import RetextProvider from '../RetextProvider';

const provider = new RetextProvider();

const TERM_TEXT = 'Terminology mining, term extraction, term recognition, ' +
    'or glossary extraction, is a subtask of information extraction. The ' + 
    'goal of terminology extraction is to automatically extract relevant ' + 
    'terms from a given corpus.';

test('returns no keywords or keyphrases if no text is provided', async () => {
    const expectedResult: KeyphraseResponse = {
        keywords: [],
        keyphrases: []
    };

    const result = await provider.findKeyphrases('');

    expect(result).toEqual(expectedResult);
});

test('returns expected list of keywords given text', async () => {
    const expectedResult: string[] = [
        'extraction',
        'term',
        'terminology',
        'recognition',
        'glossary',
        'subtask',
        'information',
        'corpus'
    ];

    const result = await provider.findKeyphrases(TERM_TEXT);

    expect(result.keywords).toEqual(expectedResult);
});

test('returns expected list of keyphrases given text', async () => {
    const expectedResult: string[] = [
        'term extraction',
        'terminology extraction',
        'glossary extraction',
        'information extraction',
        'term recognition'
    ];

    const result = await provider.findKeyphrases(TERM_TEXT);

    expect(result.keyphrases).toEqual(expectedResult);
});
