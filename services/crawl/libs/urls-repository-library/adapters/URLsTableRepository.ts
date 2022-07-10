import dynamoose from "dynamoose";

import URLsTableKeyFields from "../enums/URLsTableKeyFields";
import { Pathname, Repository } from "../ports/Repository";
import URLsTablePathSchema from "../schemas/URLsTablePathSchema";
import URLsTablePathItem from "../schemas/URLsTablePathItem";

class URLsTableRepository implements Repository {
    private pathModel;

    constructor(tableName: string, createTable?: boolean) {
        this.pathModel = dynamoose.model<URLsTablePathItem>(
            tableName,
            URLsTablePathSchema
        );

        new dynamoose.Table(tableName, [this.pathModel], {
            create: createTable || false,
        });
    }

    async deletePathnames(baseURL: string): Promise<boolean> {
        const pathnames = await this.getPathnames(baseURL);
        const items = pathnames.map((pathname) => ({
            [URLsTableKeyFields.HashKey]: baseURL,
            [URLsTableKeyFields.SortKey]: pathname.pathname,
        }));

        try {
            await this.pathModel.batchDelete(items);
            return true;
        } catch (ex) {
            console.error(`An error occured during deletion: ${ex}`);
            return false;
        }
    }

    async getPathnames(baseURL: string): Promise<Pathname[]> {
        const documents = await this.pathModel
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
        const documents = await this.pathModel
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
            await this.pathModel.create(
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
