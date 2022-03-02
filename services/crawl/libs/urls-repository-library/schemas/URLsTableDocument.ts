import { Document } from "dynamoose/dist/Document";

import URLsTableKeyFields from "../enums/URLsTableKeyFields";

class URLsTableDocument extends Document {
    [URLsTableKeyFields.HashKey]: string;
    [URLsTableKeyFields.SortKey]: string;
    "createdAt": Date;
    "updatedAt": Date;
}

export default URLsTableDocument;
