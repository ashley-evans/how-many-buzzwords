enum KeyphraseTableKeyFields {
    HashKey = 'BaseUrl',
    SortKey = 'KeyPhrase'
}

enum KeyphraseTableNonKeyFields {
    Occurence = 'Occurences'
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
