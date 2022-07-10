import { Item } from "dynamoose/dist/Item";

import {
    URLsTableKeyFields,
    URLsTableNonKeyFields,
} from "../enums/URLsTableFields";
import CrawlStatus from "../enums/CrawlStatus";

class URLsTableStatusItem extends Item {
    [URLsTableKeyFields.HashKey]!: string;
    [URLsTableKeyFields.SortKey]!: string;
    [URLsTableNonKeyFields.Status]!: CrawlStatus;
    "createdAt": Date;
    "updatedAt": Date;
}

export default URLsTableStatusItem;
