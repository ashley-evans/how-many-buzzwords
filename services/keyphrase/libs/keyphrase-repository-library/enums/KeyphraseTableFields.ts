enum KeyphraseTableKeyFields {
    HashKey = "pk",
    RangeKey = "sk",
    KeyphraseUsageIndexHashKey = "kui_pk",
}

enum KeyphraseTableNonKeyFields {
    Occurrences = "Occurrences",
    Aggregated = "Aggregated",
}

export { KeyphraseTableKeyFields, KeyphraseTableNonKeyFields };
