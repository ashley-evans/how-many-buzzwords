import dynamoose from "dynamoose";

import { URLsTableKeyFields } from "../enums/URLsTableFields";
import URLsTableConstants from "../enums/URLsTableConstants";
import CrawlStatus from "../enums/CrawlStatus";
import { Pathname, Repository } from "../ports/Repository";
import URLsTablePathSchema from "../schemas/URLsTablePathSchema";
import URLsTablePathItem from "../schemas/URLsTablePathItem";
import URLsTableStatusItem from "../schemas/URLsTableStatusItem";
import URLsTableStatusSchema from "../schemas/URLsTableStatusSchema";

type PathnameKeys = {
    [URLsTableKeyFields.HashKey]: string;
    [URLsTableKeyFields.SortKey]: string;
};

class URLsTableRepository implements Repository {
    private static BATCH_SIZE = 25;
    private pathModel;
    private statusModel;

    constructor(tableName: string, createTable?: boolean) {
        this.pathModel = dynamoose.model<URLsTablePathItem>(
            tableName,
            URLsTablePathSchema
        );

        this.statusModel = dynamoose.model<URLsTableStatusItem>(
            tableName,
            URLsTableStatusSchema
        );

        new dynamoose.Table(tableName, [this.pathModel, this.statusModel], {
            create: createTable || false,
        });
    }

    async getCrawlStatus(baseURL: string): Promise<CrawlStatus | undefined> {
        const documents = await this.statusModel
            .query(URLsTableKeyFields.HashKey)
            .eq(this.createURLPartitionKey(baseURL))
            .where(URLsTableKeyFields.SortKey)
            .eq(URLsTableConstants.StatusSortKey)
            .exec();

        if (documents.length == 0) {
            return undefined;
        }

        return documents[0].status;
    }

    async updateCrawlStatus(
        baseURL: string,
        status: CrawlStatus
    ): Promise<boolean> {
        try {
            await this.statusModel.create(
                {
                    pk: this.createURLPartitionKey(baseURL),
                    sk: URLsTableConstants.StatusSortKey,
                    status,
                },
                {
                    overwrite: true,
                }
            );

            console.log(
                `Successfully updated crawl status to: ${status} for ${baseURL}`
            );

            return true;
        } catch (ex) {
            console.error(
                `An occurred during status update for ${baseURL}:` +
                    JSON.stringify(ex)
            );

            return false;
        }
    }

    async deleteCrawlStatus(baseURL: string): Promise<boolean> {
        try {
            await this.statusModel.delete({
                pk: this.createURLPartitionKey(baseURL),
                sk: URLsTableConstants.StatusSortKey,
            });

            return true;
        } catch (ex) {
            console.error(
                `An occurred during crawl status deletion for ${baseURL}:` +
                    JSON.stringify(ex)
            );

            return false;
        }
    }

    async deletePathnames(baseURL: string): Promise<boolean> {
        const pathnames = await this.getPathnames(baseURL);
        if (pathnames.length == 0) {
            return false;
        }

        const items: PathnameKeys[] = pathnames.map((pathname) => ({
            [URLsTableKeyFields.HashKey]: this.createURLPartitionKey(baseURL),
            [URLsTableKeyFields.SortKey]: this.createPathnameSortKey(
                pathname.pathname
            ),
        }));

        const batches = this.createBatches(items);
        const batchDeleteOutcomes = batches.map((batch) => {
            return this.deletePathnameBatch(batch);
        });

        try {
            return (await Promise.all(batchDeleteOutcomes)).every(Boolean);
        } catch (ex) {
            console.error(
                `An error occured during pathname deletion for URL: ${baseURL}. Error: ${ex}`
            );

            return false;
        }
    }

    async getPathnames(baseURL: string): Promise<Pathname[]> {
        const documents = await this.pathModel
            .query(URLsTableKeyFields.HashKey)
            .eq(this.createURLPartitionKey(baseURL))
            .filter(URLsTableKeyFields.SortKey)
            .beginsWith(URLsTableConstants.PathSortKeyPrefix)
            .exec();

        return documents.map((document) => ({
            pathname: this.extractPathname(document.sk),
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
            .eq(this.createURLPartitionKey(baseURL))
            .where(URLsTableKeyFields.SortKey)
            .eq(this.createPathnameSortKey(pathname))
            .exec();

        if (documents.count == 0) {
            return undefined;
        }

        return {
            pathname: this.extractPathname(documents[0].sk),
            createdAt: documents[0].createdAt,
            updatedAt: documents[0].updatedAt,
        };
    }

    async storePathname(baseURL: string, pathname: string): Promise<boolean> {
        try {
            await this.pathModel.create(
                {
                    pk: this.createURLPartitionKey(baseURL),
                    sk: this.createPathnameSortKey(pathname),
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

    private createURLPartitionKey(baseURL: string): string {
        return `${URLsTableConstants.URLPartitionKeyPrefix}#${baseURL}`;
    }

    private createPathnameSortKey(pathname: string): string {
        return `${URLsTableConstants.PathSortKeyPrefix}#${pathname}`;
    }

    private extractPathname(sortKey: string): string {
        return sortKey.split("#")[1];
    }

    private async deletePathnameBatch(batch: PathnameKeys[]): Promise<boolean> {
        const result = await this.pathModel.batchDelete(batch);
        return result.unprocessedItems.length == 0;
    }

    private createBatches<Type>(inputArray: Type[]): Type[][] {
        return inputArray.reduce((result: Type[][], item, index) => {
            const batchIndex = Math.floor(
                index / URLsTableRepository.BATCH_SIZE
            );
            if (!result[batchIndex]) {
                result[batchIndex] = [];
            }

            result[batchIndex].push(item);
            return result;
        }, []);
    }
}

export default URLsTableRepository;
