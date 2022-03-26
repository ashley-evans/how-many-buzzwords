import dynamoose from "dynamoose";
import { QueryResponse } from "dynamoose/dist/ItemRetriever";

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
    private static BATCH_SIZE = 25;
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
        const items = await this.queryKeyphrases(baseURL);
        if (items.length == 0) {
            return false;
        }

        const batches = this.createBatches(this.convertResponseToKeys(items));
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
        const documents = await this.queryKeyphrases(baseURL);
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

        const items = occurrences.map((occurrence) =>
            this.createOccurrenceItem(baseURL, pathname, occurrence)
        );
        const batches = this.createBatches(items);
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

    private async queryKeyphrases(
        baseURL: string
    ): Promise<QueryResponse<KeyphraseTableOccurrenceItem>> {
        return this.pathOccurrenceModel
            .query(KeyphraseTableKeyFields.HashKey)
            .eq(baseURL)
            .exec();
    }

    private convertResponseToKeys(
        response: QueryResponse<KeyphraseTableOccurrenceItem>
    ): KeyphraseOccurrenceKeys[] {
        return response.map((item) => ({
            [KeyphraseTableKeyFields.HashKey]: item.pk,
            [KeyphraseTableKeyFields.RangeKey]: item.sk,
        }));
    }

    private async storeIndividualKeyphrase(
        baseURL: string,
        pathname: string,
        occurrence: KeyphraseOccurrences
    ) {
        try {
            await this.pathOccurrenceModel.create(
                this.createOccurrenceItem(baseURL, pathname, occurrence),
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

    private createOccurrenceItem(
        baseURL: string,
        pathname: string,
        occurrence: KeyphraseOccurrences
    ): Partial<KeyphraseTableOccurrenceItem> {
        return {
            pk: baseURL,
            sk: `${pathname}#${occurrence.keyphrase}`,
            Occurrences: occurrence.occurrences,
        };
    }

    private async deleteKeyphraseBatch(
        baseURL: string,
        batch: KeyphraseOccurrenceKeys[]
    ): Promise<boolean> {
        if (batch.length > KeyphraseRepository.BATCH_SIZE) {
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
        if (batch.length > KeyphraseRepository.BATCH_SIZE) {
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
