import { Item } from "dynamoose/dist/Item";

import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
} from "../enums/KeyphraseTableFields";

class KeyphraseTableItem extends Item {
    [KeyphraseTableKeyFields.HashKey]: string;
    [KeyphraseTableKeyFields.RangeKey]: string;
    [KeyphraseTableNonKeyFields.Occurrences]: number;
}

export default KeyphraseTableItem;
