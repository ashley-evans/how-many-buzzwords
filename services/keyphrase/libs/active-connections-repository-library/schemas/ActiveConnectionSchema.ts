import { Schema } from "dynamoose";

import {
    ActiveConnectionsTableKeyFields,
    ActiveConnectionsTableNonKeyFields,
} from "../enums/ActiveConnectionsTableFields";

const schema = new Schema({
    [ActiveConnectionsTableKeyFields.ConnectionIDKey]: {
        type: String,
        hashKey: true,
    },
    [ActiveConnectionsTableKeyFields.ListeningURLKey]: {
        type: String,
        required: true,
    },
    [ActiveConnectionsTableNonKeyFields.CallbackURLKey]: {
        type: String,
        required: true,
    },
});

export default schema;
