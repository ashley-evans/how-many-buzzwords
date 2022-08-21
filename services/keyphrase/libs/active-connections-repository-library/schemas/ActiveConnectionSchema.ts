import { Schema } from "dynamoose";

import {
    ActiveConnectionsTableKeyFields,
    ActiveConnectionsTableNonKeyFields,
} from "../enums/ActiveConnectionsTableFields";
import ActiveConnectionsTableConstants from "../enums/ActiveConnectionsTableConstants";

const schema = new Schema({
    [ActiveConnectionsTableKeyFields.ConnectionIDKey]: {
        type: String,
        hashKey: true,
    },
    [ActiveConnectionsTableKeyFields.ListeningURLKey]: {
        type: String,
        index: {
            name: ActiveConnectionsTableConstants.ListeningConnectionsIndexName,
            type: "global",
            rangeKey: ActiveConnectionsTableKeyFields.ConnectionIDKey,
            project: true,
        },
        required: true,
    },
    [ActiveConnectionsTableNonKeyFields.CallbackURLKey]: {
        type: String,
        required: true,
    },
});

export default schema;
