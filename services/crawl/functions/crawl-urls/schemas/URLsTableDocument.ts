import { Document } from 'dynamoose/dist/Document';
import { URLsTableKeyFields } from 'buzzword-aws-crawl-common';

class URLsTableDocument extends Document {
    [URLsTableKeyFields.HashKey]: string;
    [URLsTableKeyFields.SortKey]: string;
}

export default URLsTableDocument;
