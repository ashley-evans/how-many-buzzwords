enum KeyphraseTableKeyFields {
    HashKey = "pk",
    RangeKey = "sk",
    KeyphraseUsageIndexHashKey = "kui_pk",
}

enum KeyphraseTableNonKeyFields {
    Occurrences = "Occurrences",
}

export { KeyphraseTableKeyFields, KeyphraseTableNonKeyFields };
