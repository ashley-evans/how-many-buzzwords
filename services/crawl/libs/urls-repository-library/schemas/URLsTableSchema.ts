import { Schema } from 'dynamoose';

import URLsTableKeyFields from '../enums/URLsTableKeyFields';

const schema = new Schema({
    [URLsTableKeyFields.HashKey]: {
        type: String,
        hashKey: true
    },
    [URLsTableKeyFields.SortKey]: {
        type: String,
        rangeKey: true
    }
}, {
    timestamps: true
});

export default schema;
