import dynamoose from "dynamoose";
import { QueryResponse, ScanResponse } from "dynamoose/dist/ItemRetriever";

import {
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields,
} from "../enums/KeyphraseTableFields";
import KeyphraseTableConstants from "../enums/KeyphraseTableConstants";
import {
    KeyphraseOccurrences,
    PathnameOccurrences,
    Repository,
    SiteKeyphrase,
    SiteKeyphraseOccurrences,
} from "../ports/Repository";
import KeyphraseTableOccurrenceItem from "../schemas/KeyphraseTableOccurrenceItem";
import KeyphraseTableOccurrenceSchema from "../schemas/KeyphraseTableOccurrenceSchema";
import KeyphraseTableTotalItem from "../schemas/KeyphraseTableTotalItem";
import KeyphraseTableTotalSchema from "../schemas/KeyphraseTableTotalSchema";

type KeyphraseOccurrenceKeys = {
    [KeyphraseTableKeyFields.HashKey]: string;
    [KeyphraseTableKeyFields.RangeKey]: string;
};

type TransactionCanceledException = {
    CancellationReasons: { Code: string }[];
};

class KeyphraseRepository implements Repository {
    private static BATCH_SIZE = 25;
    private occurrenceModel;
    private totalModel;

    constructor(tableName: string, createTable?: boolean) {
        this.totalModel = dynamoose.model<KeyphraseTableTotalItem>(
            "total",
            KeyphraseTableTotalSchema
        );
        this.occurrenceModel = dynamoose.model<KeyphraseTableOccurrenceItem>(
            "occurrence",
            KeyphraseTableOccurrenceSchema
        );

        new dynamoose.Table(
            tableName,
            [this.totalModel, this.occurrenceModel],
            {
                create: createTable || false,
            }
        );
    }

    async empty(): Promise<boolean> {
        const keyphrases = (await this.occurrenceModel
            .scan()
            .exec()) as ScanResponse<KeyphraseTableOccurrenceItem>;
        if (keyphrases.length == 0) {
            return true;
        }

        const batches = this.createBatches(
            this.convertResponseToKeys(keyphrases)
        );
        const promises = batches.map(async (batch) => {
            if (batch.length > KeyphraseRepository.BATCH_SIZE) {
                return false;
            }

            const result = await this.occurrenceModel.batchDelete(batch);
            return result.unprocessedItems.length == 0;
        });

        try {
            return (await Promise.all(promises)).every(Boolean);
        } catch (ex) {
            return false;
        }
    }

    getOccurrences(
        baseURL: string,
        pathname: string,
        keyphrase: string
    ): Promise<KeyphraseOccurrences | undefined>;
    getOccurrences(
        baseURL: string,
        pathname: string
    ): Promise<KeyphraseOccurrences[]>;
    getOccurrences(baseURL: string): Promise<PathnameOccurrences[]>;

    async getOccurrences(
        baseURL: string,
        pathname?: string,
        keyphrase?: string
    ): Promise<
        | KeyphraseOccurrences
        | undefined
        | KeyphraseOccurrences[]
        | PathnameOccurrences[]
    > {
        if (pathname && keyphrase) {
            const item = await this.getKeyphrase(baseURL, pathname, keyphrase);
            if (item) {
                const splitSK = item.sk.split("#");
                return {
                    keyphrase: splitSK[1],
                    occurrences: item.Occurrences,
                    aggregated: item.Aggregated,
                };
            }

            return item;
        }

        const documents = await this.queryKeyphrases(
            baseURL,
            pathname ? `${pathname}#` : undefined
        );

        if (pathname) {
            return documents.map((document) => {
                const splitSK = document.sk.split("#");
                return {
                    keyphrase: splitSK[1],
                    occurrences: document.Occurrences,
                    aggregated: document.Aggregated,
                };
            });
        }

        return documents.map((document) => {
            const splitSK = document.sk.split("#");
            return {
                pathname: splitSK[0],
                keyphrase: splitSK[1],
                occurrences: document.Occurrences,
                aggregated: document.Aggregated,
            };
        });
    }

    async storeKeyphrases(
        baseURL: string,
        pathname: string,
        occurrences: KeyphraseOccurrences | KeyphraseOccurrences[]
    ): Promise<boolean> {
        if (Array.isArray(occurrences)) {
            const items = occurrences.map((occurrence) =>
                this.createOccurrenceItem(baseURL, pathname, occurrence)
            );

            return this.storeOccurrenceItems(items);
        }

        const item = this.createOccurrenceItem(baseURL, pathname, occurrences);
        return this.storeIndividualKeyphrase(item);
    }

    async addOccurrencesToTotals(
        items: SiteKeyphraseOccurrences | SiteKeyphraseOccurrences[]
    ): Promise<boolean> {
        if (Array.isArray(items)) {
            const promises = items.map((item) => this.addItemToTotal(item));
            return (await Promise.all(promises)).every(Boolean);
        }

        return this.addItemToTotal(items);
    }

    async setKeyphraseAggregated(
        keyphrases: SiteKeyphrase | SiteKeyphrase[]
    ): Promise<boolean> {
        if (Array.isArray(keyphrases)) {
            const promises = keyphrases.map((keyphrase) =>
                this.setAggregatedFlag(keyphrase)
            );
            return (await Promise.all(promises)).every(Boolean);
        }

        return this.setAggregatedFlag(keyphrases);
    }

    async getTotals(baseURL?: string): Promise<KeyphraseOccurrences[]> {
        let totals;
        if (baseURL) {
            totals = await this.queryKeyphrases(
                baseURL,
                `${KeyphraseTableConstants.TotalKey}#`
            );
        } else {
            totals = await this.queryKeyphrases(
                KeyphraseTableConstants.TotalKey
            );
        }

        return totals.map((total) => ({
            keyphrase: baseURL ? total.sk.split("#")[1] : total.sk,
            occurrences: total.Occurrences,
        }));
    }

    async getKeyphraseUsages(keyphrase: string): Promise<string[]> {
        const usages = (await this.totalModel
            .query(KeyphraseTableKeyFields.KeyphraseUsageIndexHashKey)
            .eq(`${KeyphraseTableConstants.KeyphraseEntityKey}#${keyphrase}`)
            .using(KeyphraseTableConstants.KeyphraseUsageIndexName)
            .exec()) as QueryResponse<KeyphraseTableTotalItem>;

        return usages.map((usage) => usage.pk);
    }

    private async getKeyphrase(
        baseURL: string,
        pathname: string,
        keyphrase: string
    ): Promise<KeyphraseTableOccurrenceItem | undefined> {
        try {
            return await this.occurrenceModel.get({
                [KeyphraseTableKeyFields.HashKey]: baseURL,
                [KeyphraseTableKeyFields.RangeKey]: `${pathname}#${keyphrase}`,
            });
        } catch {
            return undefined;
        }
    }

    private async queryKeyphrases(
        pk: string,
        sk?: string
    ): Promise<QueryResponse<KeyphraseTableOccurrenceItem>> {
        if (sk) {
            return this.occurrenceModel
                .query({
                    [KeyphraseTableKeyFields.HashKey]: {
                        eq: pk,
                    },
                    [KeyphraseTableKeyFields.RangeKey]: {
                        beginsWith: sk,
                    },
                })
                .exec();
        }

        return this.occurrenceModel
            .query(KeyphraseTableKeyFields.HashKey)
            .eq(pk)
            .exec();
    }

    private convertResponseToKeys(
        response: KeyphraseTableOccurrenceItem[]
    ): KeyphraseOccurrenceKeys[] {
        return response.map((item) => ({
            [KeyphraseTableKeyFields.HashKey]: item.pk,
            [KeyphraseTableKeyFields.RangeKey]: item.sk,
        }));
    }

    private async storeIndividualKeyphrase(
        item: Partial<KeyphraseTableOccurrenceItem>
    ) {
        try {
            await this.occurrenceModel.create(item, {
                overwrite: true,
            });

            console.log(`Successfully stored: ${JSON.stringify(item)}`);

            return true;
        } catch (ex) {
            console.error(
                `An error occurred during the storage of ${JSON.stringify(
                    item
                )}. Error: ${ex}`
            );

            return false;
        }
    }

    private createOccurrenceItem(
        baseURL: string,
        pathname: string,
        occurrence: KeyphraseOccurrences
    ): Partial<KeyphraseTableOccurrenceItem> {
        return {
            pk: baseURL,
            sk: `${pathname}#${occurrence.keyphrase}`,
            Occurrences: occurrence.occurrences,
            Aggregated: false,
        };
    }

    private async storeOccurrenceItems(
        items: Partial<KeyphraseTableOccurrenceItem>[]
    ) {
        const batches = this.createBatches(items);
        const promises = batches.map((batch) =>
            this.storeKeyphrasesBatch(batch)
        );

        try {
            return (await Promise.all(promises)).every(Boolean);
        } catch (ex) {
            console.error(
                `An error occurred during the storage of ${JSON.stringify(
                    items
                )}. Error: ${ex}`
            );

            return false;
        }
    }

    private async storeKeyphrasesBatch(
        batch: Partial<KeyphraseTableOccurrenceItem>[]
    ): Promise<boolean> {
        if (batch.length > KeyphraseRepository.BATCH_SIZE) {
            return false;
        }

        const result = await this.occurrenceModel.batchPut(batch);
        const success = result.unprocessedItems.length == 0;
        if (success) {
            console.log(`Successfully stored: ${JSON.stringify(batch)}`);

            return success;
        }

        console.error(
            `Batch write failed to write the following: ${JSON.stringify(
                result.unprocessedItems
            )}`
        );

        return false;
    }

    private async addItemToTotal(item: SiteKeyphraseOccurrences) {
        try {
            const itemKey = this.createOccurrenceKey(
                item.baseURL,
                item.pathname,
                item.keyphrase
            );
            const siteTotalKey = this.createSiteTotalKey(
                item.baseURL,
                item.keyphrase
            );
            const globalTotalKey = this.createGlobalTotalKey(item.keyphrase);
            await dynamoose.transaction([
                this.totalModel.transaction.update(siteTotalKey, {
                    $ADD: {
                        [KeyphraseTableNonKeyFields.Occurrences]:
                            item.occurrences,
                    },
                    $SET: {
                        [KeyphraseTableKeyFields.KeyphraseUsageIndexHashKey]: `${KeyphraseTableConstants.KeyphraseEntityKey}#${item.keyphrase}`,
                    },
                }),
                this.occurrenceModel.transaction.update(globalTotalKey, {
                    $ADD: {
                        [KeyphraseTableNonKeyFields.Occurrences]:
                            item.occurrences,
                    },
                }),
                this.occurrenceModel.transaction.update(
                    itemKey,
                    {
                        $SET: {
                            [KeyphraseTableNonKeyFields.Aggregated]: true,
                        },
                    },
                    {
                        condition: new dynamoose.Condition()
                            .where(KeyphraseTableNonKeyFields.Aggregated)
                            .eq(false),
                    }
                ),
            ]);

            console.log(
                `Successfully updated total with: ${JSON.stringify(item)}`
            );
            return true;
        } catch (ex) {
            if (
                this.isTransactionCancelledException(ex) &&
                ex.CancellationReasons[2]?.Code == "ConditionalCheckFailed"
            ) {
                return true;
            }

            console.error(
                `An error occurred during updating total with ${JSON.stringify(
                    item
                )}. Error: ${ex}`
            );

            return false;
        }
    }

    private async setAggregatedFlag(item: SiteKeyphrase): Promise<boolean> {
        const condition = new dynamoose.Condition()
            .filter(KeyphraseTableNonKeyFields.Aggregated)
            .exists();
        const itemKey = this.createOccurrenceKey(
            item.baseURL,
            item.pathname,
            item.keyphrase
        );

        try {
            await this.occurrenceModel.update(
                itemKey,
                {
                    [KeyphraseTableNonKeyFields.Aggregated]: true,
                },
                { condition }
            );

            console.log(
                `Successfully set aggregated flag for: ${JSON.stringify(item)}`
            );
        } catch (ex) {
            console.error(
                `An error occurred setting aggregated flag for: ${JSON.stringify(
                    item
                )}. Error: ${ex}`
            );

            return false;
        }

        return true;
    }

    private createSiteTotalKey(
        baseURL: string,
        keyphrase: string
    ): KeyphraseOccurrenceKeys {
        return {
            pk: baseURL,
            sk: `${KeyphraseTableConstants.TotalKey}#${keyphrase}`,
        };
    }

    private createGlobalTotalKey(keyphrase: string): KeyphraseOccurrenceKeys {
        return {
            pk: KeyphraseTableConstants.TotalKey,
            sk: keyphrase,
        };
    }

    private createOccurrenceKey(
        baseURL: string,
        pathname: string,
        keyphrase: string
    ): KeyphraseOccurrenceKeys {
        return {
            pk: baseURL,
            sk: `${pathname}#${keyphrase}`,
        };
    }

    private createBatches<Type>(inputArray: Type[]): Type[][] {
        return inputArray.reduce((result: Type[][], item, index) => {
            const batchIndex = Math.floor(
                index / KeyphraseRepository.BATCH_SIZE
            );
            if (!result[batchIndex]) {
                result[batchIndex] = [];
            }

            result[batchIndex].push(item);
            return result;
        }, []);
    }

    private isTransactionCancelledException(
        exception: unknown
    ): exception is TransactionCanceledException {
        const transactionCancelled = exception as TransactionCanceledException;
        if (Array.isArray(transactionCancelled.CancellationReasons)) {
            for (const reason of transactionCancelled.CancellationReasons) {
                if (
                    reason.Code === undefined &&
                    typeof reason.Code === "string"
                ) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }
}

export default KeyphraseRepository;
