import { Item } from "dynamoose/dist/Item";

import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
} from "../enums/KeyphraseTableFields";

class KeyphraseTableOccurrenceItem extends Item {
    [KeyphraseTableKeyFields.HashKey]!: string;
    [KeyphraseTableKeyFields.RangeKey]!: string;
    [KeyphraseTableNonKeyFields.Occurrences]!: number;
    [KeyphraseTableNonKeyFields.Aggregated]!: boolean | undefined;
}

export default KeyphraseTableOccurrenceItem;
