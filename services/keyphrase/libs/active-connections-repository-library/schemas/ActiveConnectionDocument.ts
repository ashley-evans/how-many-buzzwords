import { Document } from "dynamoose/dist/Document";

import {
    ActiveConnectionsTableKeyFields,
    ActiveConnectionsTableNonKeyFields,
} from "../enums/ActiveConnectionsTableFields";

class ActiveConnectionDocument extends Document {
    [ActiveConnectionsTableKeyFields.ConnectionIDKey]: string;
    [ActiveConnectionsTableKeyFields.ListeningURLKey]: string;
    [ActiveConnectionsTableNonKeyFields.CallbackURLKey]: string;
}

export default ActiveConnectionDocument;
