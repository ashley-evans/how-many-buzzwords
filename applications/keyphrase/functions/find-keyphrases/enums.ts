enum KeyphraseTableKeyFields {
    HashKey = 'BaseUrl',
    SortKey = 'KeyPhrase'
}

enum KeyphraseTableNonKeyFields {
    Occurrence = 'Occurrences'
}

enum URLsTableKeyFields {
    HashKey = 'BaseUrl',
    SortKey = 'Pathname'
}

export {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
    URLsTableKeyFields
};
