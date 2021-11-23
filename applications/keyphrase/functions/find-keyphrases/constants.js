const keyPhraseTableKeyFields = Object.freeze({
    HASH_KEY: 'BaseUrl',
    SORT_KEY: 'KeyPhrase'
});

const keyPhraseTableNonKeyFields = Object.freeze({
    OCCURENCES_FIELD: 'Occurences'
});

const urlsTableKeyFields = Object.freeze({
    HASH_KEY: 'BaseUrl',
    SORT_KEY: 'Pathname'
});

module.exports = {
    keyPhraseTableKeyFields,
    keyPhraseTableNonKeyFields,
    urlsTableKeyFields
};
