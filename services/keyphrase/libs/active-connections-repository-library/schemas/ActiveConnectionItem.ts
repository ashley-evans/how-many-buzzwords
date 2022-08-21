import { Item } from "dynamoose/dist/Item";

import {
    ActiveConnectionsTableKeyFields,
    ActiveConnectionsTableNonKeyFields,
} from "../enums/ActiveConnectionsTableFields";

class ActiveConnectionDocument extends Item {
    [ActiveConnectionsTableKeyFields.ConnectionIDKey]!: string;
    [ActiveConnectionsTableKeyFields.ListeningURLKey]!: string;
    [ActiveConnectionsTableNonKeyFields.CallbackURLKey]!: string;
}

export default ActiveConnectionDocument;
