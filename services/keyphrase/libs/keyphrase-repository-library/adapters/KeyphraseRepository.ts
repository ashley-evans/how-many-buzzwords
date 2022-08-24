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
} from "../ports/Repository";
import KeyphraseTableOccurrenceItem from "../schemas/KeyphraseTableOccurrenceItem";
import KeyphraseTableOccurrenceSchema from "../schemas/KeyphraseTableOccurrenceSchema";
import KeyphraseTableTotalItem from "../schemas/KeyphraseTableTotalItem";
import KeyphraseTableTotalSchema from "../schemas/KeyphraseTableTotalSchema";

type KeyphraseOccurrenceKeys = {
    [KeyphraseTableKeyFields.HashKey]: string;
    [KeyphraseTableKeyFields.RangeKey]: string;
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

    getKeyphrases(
        baseURL: string,
        pathname: string
    ): Promise<KeyphraseOccurrences[]>;
    getKeyphrases(baseURL: string): Promise<PathnameOccurrences[]>;

    async getKeyphrases(
        baseURL: string,
        pathname?: string
    ): Promise<KeyphraseOccurrences[] | PathnameOccurrences[]> {
        const documents = await this.queryKeyphrases(
            baseURL,
            pathname ? `${pathname}#` : undefined
        );

        if (!pathname) {
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

        return documents.map((document) => {
            const splitSK = document.sk.split("#");
            return {
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

    async addTotals(
        baseURL: string,
        totals: KeyphraseOccurrences | KeyphraseOccurrences[]
    ): Promise<boolean> {
        if (Array.isArray(totals)) {
            const promises = totals.map((total) =>
                this.addIndividualTotal(baseURL, total)
            );

            return (await Promise.all(promises)).every(Boolean);
        }

        return this.addIndividualTotal(baseURL, totals);
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

    private async addIndividualTotal(
        baseURL: string,
        total: KeyphraseOccurrences
    ) {
        try {
            const siteTotalKey = this.createSiteTotalKey(baseURL, total);
            const globalTotalKey = this.createGlobalTotalKey(total);
            await dynamoose.transaction([
                this.totalModel.transaction.update(siteTotalKey, {
                    $ADD: {
                        [KeyphraseTableNonKeyFields.Occurrences]:
                            total.occurrences,
                    },
                    $SET: {
                        [KeyphraseTableKeyFields.KeyphraseUsageIndexHashKey]: `${KeyphraseTableConstants.KeyphraseEntityKey}#${total.keyphrase}`,
                    },
                }),
                this.occurrenceModel.transaction.update(globalTotalKey, {
                    $ADD: {
                        [KeyphraseTableNonKeyFields.Occurrences]:
                            total.occurrences,
                    },
                }),
            ]);

            console.log(`Successfully updated total: ${JSON.stringify(total)}`);
            return true;
        } catch (ex) {
            console.error(
                `An error occurred during the total update of ${JSON.stringify(
                    total
                )}. Error: ${ex}`
            );

            return false;
        }
    }

    private createSiteTotalKey(
        baseURL: string,
        total: KeyphraseOccurrences
    ): Partial<KeyphraseTableTotalItem> {
        return {
            pk: baseURL,
            sk: `${KeyphraseTableConstants.TotalKey}#${total.keyphrase}`,
        };
    }

    private createGlobalTotalKey(
        total: KeyphraseOccurrences
    ): Partial<KeyphraseTableOccurrenceItem> {
        return {
            pk: KeyphraseTableConstants.TotalKey,
            sk: total.keyphrase,
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
}

export default KeyphraseRepository;
