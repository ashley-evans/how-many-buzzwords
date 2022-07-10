import { Item } from "dynamoose/dist/Item";

import { URLsTableKeyFields } from "../enums/URLsTableFields";

class URLsTablePathItem extends Item {
    [URLsTableKeyFields.HashKey]!: string;
    [URLsTableKeyFields.SortKey]!: string;
    "createdAt": Date;
    "updatedAt": Date;
}

export default URLsTablePathItem;
