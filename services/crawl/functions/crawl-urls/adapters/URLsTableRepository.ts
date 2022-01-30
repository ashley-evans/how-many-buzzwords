import dynamoose from 'dynamoose';
import { URLsTableKeyFields } from 'buzzword-aws-crawl-common';

import Repository from "../ports/Repository";
import URLsTableSchema from '../schemas/URLsTableSchema';
import URLsTableDocument from '../schemas/URLsTableDocument';

class URLsTableRepository implements Repository {
    private model;

    constructor(private tableName: string, createTable?: boolean) {
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
            [URLsTableKeyFields.SortKey]: pathname
        }));

        try {
            await this.model.batchDelete(items);
            return true;
        } catch (ex) {
            console.error(`An error occured during deletion: ${ex}`);
            return false;
        }
    }

    async getPathnames(baseURL: string): Promise<string[]> {
        const documents = await this.model
            .query(URLsTableKeyFields.HashKey)
            .eq(baseURL)
            .exec();

        return documents.map((document) => document.Pathname);
    }

    async storePathname(baseURL: string, pathname: string): Promise<boolean> {
        await this.model.create(
            { 
                BaseUrl: baseURL,
                Pathname: pathname
            },
            {
                overwrite: true
            }
        );

        console.log(`Successfully stored: ${pathname} for ${baseURL}`);
        return true;
    }
}

export default URLsTableRepository;
