const keyPhraseTableKeyFields = Object.freeze({
    HASH_KEY: 'BaseUrl',
    SORT_KEY: 'KeyPhrase'
});

const keyPhraseTableNonKeyFields = Object.freeze({
    OCCURENCES_FIELD: 'Occurences'
});

module.exports = {
    keyPhraseTableKeyFields,
    keyPhraseTableNonKeyFields
};
