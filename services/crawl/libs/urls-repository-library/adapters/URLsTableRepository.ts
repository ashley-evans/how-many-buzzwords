import dynamoose from "dynamoose";

import URLsTableKeyFields from "../enums/URLsTableKeyFields";
import { Pathname, Repository } from "../ports/Repository";
import URLsTableSchema from "../schemas/URLsTableSchema";
import URLsTableDocument from "../schemas/URLsTableDocument";

class URLsTableRepository implements Repository {
    private model;

    constructor(tableName: string, createTable?: boolean) {
        this.model = dynamoose.model<URLsTableDocument>(
            tableName,
            URLsTableSchema,
            {
                create: createTable || false,
            }
        );
    }

    async deletePathnames(baseURL: string): Promise<boolean> {
        const pathnames = await this.getPathnames(baseURL);
        const items = pathnames.map((pathname) => ({
            [URLsTableKeyFields.HashKey]: baseURL,
            [URLsTableKeyFields.SortKey]: pathname.pathname,
        }));

        try {
            await this.model.batchDelete(items);
            return true;
        } catch (ex) {
            console.error(`An error occured during deletion: ${ex}`);
            return false;
        }
    }

    async getPathnames(baseURL: string): Promise<Pathname[]> {
        const documents = await this.model
            .query(URLsTableKeyFields.HashKey)
            .eq(baseURL)
            .exec();

        return documents.map((document) => ({
            pathname: document.Pathname,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
        }));
    }

    async getPathname(
        baseURL: string,
        pathname: string
    ): Promise<Pathname | undefined> {
        const documents = await this.model
            .query(URLsTableKeyFields.HashKey)
            .eq(baseURL)
            .where(URLsTableKeyFields.SortKey)
            .eq(pathname)
            .exec();

        if (documents.count == 0) {
            return undefined;
        }

        return {
            pathname: documents[0].Pathname,
            createdAt: documents[0].createdAt,
            updatedAt: documents[0].updatedAt,
        };
    }

    async storePathname(baseURL: string, pathname: string): Promise<boolean> {
        try {
            await this.model.create(
                {
                    BaseUrl: baseURL,
                    Pathname: pathname,
                },
                {
                    overwrite: true,
                }
            );

            console.log(`Successfully stored: ${pathname} for ${baseURL}`);
            return true;
        } catch (ex) {
            console.error(
                `An occurred during storage of ${pathname} for ${baseURL}:` +
                    JSON.stringify(ex)
            );

            return false;
        }
    }
}

export default URLsTableRepository;
