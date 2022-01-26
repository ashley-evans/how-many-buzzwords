import { Schema } from 'dynamoose';
import { URLsTableKeyFields } from 'buzzword-aws-crawl-common';

const schema = new Schema({
    [URLsTableKeyFields.HashKey]: {
        type: String,
        hashKey: true
    },
    [URLsTableKeyFields.SortKey]: {
        type: String,
        rangeKey: true
    }
});

export default schema;
