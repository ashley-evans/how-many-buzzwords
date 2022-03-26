import dynamoose from "dynamoose";

import { KeyphraseTableKeyFields } from "../enums/KeyphraseTableFields";
import {
    KeyphraseOccurrences,
    PathnameOccurrences,
    Repository,
} from "../ports/Repository";
import KeyphraseTableOccurrenceItem from "../schemas/KeyphraseTableOccurrenceItem";
import KeyphraseTableOccurrenceSchema from "../schemas/KeyphraseTableOccurrenceSchema";

type KeyphraseOccurrenceKeys = {
    [KeyphraseTableKeyFields.HashKey]: string;
    [KeyphraseTableKeyFields.RangeKey]: string;
};

class KeyphraseRepository implements Repository {
    private pathOccurrenceModel;

    constructor(tableName: string, createTable?: boolean) {
        this.pathOccurrenceModel =
            dynamoose.model<KeyphraseTableOccurrenceItem>(
                tableName,
                KeyphraseTableOccurrenceSchema
            );

        new dynamoose.Table(tableName, [this.pathOccurrenceModel], {
            create: createTable || false,
        });
    }

    async deleteKeyphrases(baseURL: string): Promise<boolean> {
        const keyphrases = await this.getKeyphrases(baseURL);
        if (keyphrases.length == 0) {
            return false;
        }

        const batches = keyphrases.reduce(
            (result: KeyphraseOccurrenceKeys[][], item, index) => {
                const batchIndex = Math.floor(index / 25);
                if (!result[batchIndex]) {
                    result[batchIndex] = [];
                }

                result[batchIndex].push({
                    pk: baseURL,
                    sk: this.createSortKey(item.pathname, item.keyphrase),
                });

                return result;
            },
            []
        );

        const promises = batches.map((batch) =>
            this.deleteKeyphraseBatch(baseURL, batch)
        );

        try {
            return (await Promise.all(promises)).every(Boolean);
        } catch (ex) {
            console.error(
                `An error occured during keyphrase deletion for URL: ${baseURL}. Error: ${ex}`
            );

            return false;
        }
    }

    async getKeyphraseUsages(keyphrase: string): Promise<string[]> {
        throw new Error("Method not implemented." + keyphrase);
    }

    async getKeyphrases(baseURL: string): Promise<PathnameOccurrences[]> {
        const documents = await this.pathOccurrenceModel
            .query(KeyphraseTableKeyFields.HashKey)
            .eq(baseURL)
            .exec();

        return documents.map((document) => {
            const splitSK = document.sk.split("#");
            return {
                pathname: splitSK[0],
                keyphrase: splitSK[1],
                occurrences: document.Occurrences,
            };
        });
    }

    async getPathKeyphrases(
        baseURL: string,
        pathname: string
    ): Promise<KeyphraseOccurrences[]> {
        const documents = await this.pathOccurrenceModel
            .query({
                [KeyphraseTableKeyFields.HashKey]: {
                    eq: baseURL,
                },
                [KeyphraseTableKeyFields.RangeKey]: {
                    beginsWith: `${pathname}#`,
                },
            })
            .exec();

        return documents.map((document) => {
            const splitSK = document.sk.split("#");
            return {
                keyphrase: splitSK[1],
                occurrences: document.Occurrences,
            };
        });
    }

    async storeKeyphrases(
        baseURL: string,
        pathname: string,
        occurrences: KeyphraseOccurrences | KeyphraseOccurrences[]
    ): Promise<boolean> {
        if (!Array.isArray(occurrences)) {
            return this.storeIndividualKeyphrase(
                baseURL,
                pathname,
                occurrences
            );
        }

        const batches = occurrences.reduce(
            (
                result: Partial<KeyphraseTableOccurrenceItem>[][],
                item,
                index
            ) => {
                const batchIndex = Math.floor(index / 25);
                if (!result[batchIndex]) {
                    result[batchIndex] = [];
                }

                result[batchIndex].push({
                    pk: baseURL,
                    sk: this.createSortKey(pathname, item.keyphrase),
                    Occurrences: item.occurrences,
                });

                return result;
            },
            []
        );

        const promises = batches.map((batch) =>
            this.storeKeyphrasesBatch(baseURL, batch)
        );

        try {
            return (await Promise.all(promises)).every(Boolean);
        } catch (ex) {
            console.error(
                `An error occurred during the storage of ${JSON.stringify(
                    occurrences
                )} for ${baseURL}. Error: ${ex}`
            );

            return false;
        }
    }

    private async storeIndividualKeyphrase(
        baseURL: string,
        pathname: string,
        occurrence: KeyphraseOccurrences
    ) {
        try {
            await this.pathOccurrenceModel.create(
                {
                    pk: baseURL,
                    sk: this.createSortKey(pathname, occurrence.keyphrase),
                    Occurrences: occurrence.occurrences,
                },
                {
                    overwrite: true,
                }
            );

            console.log(
                `Successfully stored: ${JSON.stringify(
                    occurrence
                )} for ${baseURL}`
            );

            return true;
        } catch (ex) {
            console.error(
                `An error occurred during the storage of ${JSON.stringify(
                    occurrence
                )} for ${baseURL}. Error: ${ex}`
            );

            return false;
        }
    }

    private async deleteKeyphraseBatch(
        baseURL: string,
        batch: KeyphraseOccurrenceKeys[]
    ): Promise<boolean> {
        if (batch.length > 25) {
            return false;
        }

        const result = await this.pathOccurrenceModel.batchDelete(batch);
        const success = result.unprocessedItems.length == 0;
        if (success) {
            console.log(
                `Successfully deleted: ${JSON.stringify(batch)} for ${baseURL}`
            );

            return success;
        }

        console.error(
            `Batch write failed to write the following: ${JSON.stringify(
                result.unprocessedItems
            )} for ${baseURL}`
        );

        return false;
    }

    private async storeKeyphrasesBatch(
        baseURL: string,
        batch: Partial<KeyphraseTableOccurrenceItem>[]
    ): Promise<boolean> {
        if (batch.length > 25) {
            return false;
        }

        const result = await this.pathOccurrenceModel.batchPut(batch);
        const success = result.unprocessedItems.length == 0;
        if (success) {
            console.log(
                `Successfully stored: ${JSON.stringify(batch)} for ${baseURL}`
            );

            return success;
        }

        console.error(
            `Batch write failed to write the following: ${JSON.stringify(
                result.unprocessedItems
            )} for ${baseURL}`
        );

        return false;
    }

    private createSortKey(pathname: string, keyphrase: string): string {
        return `${pathname}#${keyphrase}`;
    }
}

export default KeyphraseRepository;
