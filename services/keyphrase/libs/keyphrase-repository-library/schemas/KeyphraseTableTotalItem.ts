import { Item } from "dynamoose/dist/Item";

import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
} from "../enums/KeyphraseTableFields";

class KeyphraseTableTotalItem extends Item {
    [KeyphraseTableKeyFields.HashKey]!: string;
    [KeyphraseTableKeyFields.RangeKey]!: string;
    [KeyphraseTableNonKeyFields.Occurrences]!: number;
    [KeyphraseTableKeyFields.KeyphraseUsageIndexHashKey]!: string;
}

export default KeyphraseTableTotalItem;
