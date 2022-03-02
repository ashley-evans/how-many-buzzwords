import { Document } from "dynamoose/dist/Document";

import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
} from "../enums/KeyphraseTableFields";

class KeyphraseTableDocument extends Document {
    [KeyphraseTableKeyFields.HashKey]: string;
    [KeyphraseTableKeyFields.RangeKey]: string;
    [KeyphraseTableNonKeyFields.Occurrence]: number;
}

export default KeyphraseTableDocument;
