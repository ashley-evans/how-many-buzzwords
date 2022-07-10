import { Schema } from "dynamoose";

import {
    URLsTableKeyFields,
    URLsTableNonKeyFields,
} from "../enums/URLsTableFields";
import CrawlStatus from "../enums/CrawlStatus";

const schema = new Schema(
    {
        [URLsTableKeyFields.HashKey]: {
            type: String,
            hashKey: true,
        },
        [URLsTableKeyFields.SortKey]: {
            type: String,
            rangeKey: true,
        },
        [URLsTableNonKeyFields.Status]: {
            type: String,
            enum: Object.values(CrawlStatus),
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default schema;
