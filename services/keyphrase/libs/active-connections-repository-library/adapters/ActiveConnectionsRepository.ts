import dynamoose from "dynamoose";

import {
    ActiveConnectionsRepositoryPort,
    Connection,
} from "../ports/ActiveConnectionsRepositoryPort";
import ActiveConnectionDocument from "../schemas/ActiveConnectionDocument";
import ActiveConnectionSchema from "../schemas/ActiveConnectionSchema";
import { ActiveConnectionsTableKeyFields } from "../enums/ActiveConnectionsTableFields";
import ActiveConnectionsTableConstants from "../enums/ActiveConnectionsTableConstants";

class ActiveConnectionsRepository implements ActiveConnectionsRepositoryPort {
    private activeConnectionModel;

    constructor(tableName: string, createTable?: boolean) {
        this.activeConnectionModel = dynamoose.model<ActiveConnectionDocument>(
            tableName,
            ActiveConnectionSchema,
            { create: createTable || false }
        );
    }

    async getListeningConnections(baseURL: string): Promise<Connection[]> {
        const documents = (await this.activeConnectionModel
            .query(ActiveConnectionsTableKeyFields.ListeningURLKey)
            .eq(baseURL)
            .using(
                ActiveConnectionsTableConstants.ListeningConnectionsIndexName
            )
            .exec()) as ActiveConnectionDocument[];

        return documents.map((document) => ({
            connectionID: document.ConnectionID,
            callbackURL: new URL(document.CallbackURL),
        }));
    }

    async storeConnection(
        connection: Connection,
        baseURL: string
    ): Promise<boolean> {
        try {
            await this.activeConnectionModel.create(
                {
                    ConnectionID: connection.connectionID,
                    ListeningURL: baseURL,
                    CallbackURL: connection.callbackURL.toString(),
                },
                {
                    overwrite: true,
                }
            );

            console.log(
                `Successfully stored connection ID: ${connection.connectionID} against URL: ${baseURL}`
            );

            return true;
        } catch (ex) {
            console.error(
                `An error occurred while storing connection ID: ${connection.connectionID} against URL: ${baseURL}. Error: ${ex}`
            );

            return false;
        }
    }

    async deleteConnection(connectionID: string): Promise<boolean> {
        try {
            await this.activeConnectionModel.delete(connectionID);

            console.log(`Successfully deleted connection ID: ${connectionID}`);

            return true;
        } catch (ex) {
            console.error(
                `An error occurred while deleting connection ID: ${connectionID}. Error: ${ex}`
            );

            return false;
        }
    }
}

export default ActiveConnectionsRepository;
