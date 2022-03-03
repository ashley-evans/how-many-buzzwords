import { Schema } from "dynamoose";

import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
} from "../enums/KeyphraseTableFields";

const schema = new Schema({
    [KeyphraseTableKeyFields.HashKey]: {
        type: String,
        hashKey: true,
    },
    [KeyphraseTableKeyFields.RangeKey]: {
        type: String,
        rangeKey: true,
    },
    [KeyphraseTableNonKeyFields.Occurrence]: {
        type: Number,
    },
});

export default schema;
