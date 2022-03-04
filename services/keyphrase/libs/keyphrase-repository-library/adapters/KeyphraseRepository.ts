import dynamoose from "dynamoose";

import { KeyphraseTableKeyFields } from "../enums/KeyphraseTableFields";
import { KeyphraseOccurrences, Repository } from "../ports/Repository";
import KeyphraseTableDocument from "../schemas/KeyphraseTableDocument";
import KeyphraseTableSchema from "../schemas/KeyphraseTableSchema";

class KeyphraseRepository implements Repository {
    private model;

    constructor(tableName: string, createTable?: boolean) {
        this.model = dynamoose.model<KeyphraseTableDocument>(
            tableName,
            KeyphraseTableSchema,
            {
                create: createTable || false,
            }
        );
    }

    async deleteKeyphrases(baseURL: string): Promise<boolean> {
        const keyphrases = await this.getKeyphrases(baseURL);
        const documents = keyphrases.map((keyphrase) => ({
            [KeyphraseTableKeyFields.HashKey]: baseURL,
            [KeyphraseTableKeyFields.RangeKey]: keyphrase.keyphrase,
        }));

        if (documents.length == 0) {
            return false;
        }

        try {
            await this.model.batchDelete(documents);
            return true;
        } catch (ex) {
            console.error(`An error occured during deletion: ${ex}`);
            return false;
        }
    }

    async getKeyphrases(baseURL: string): Promise<KeyphraseOccurrences[]> {
        const documents = await this.model
            .query(KeyphraseTableKeyFields.HashKey)
            .eq(baseURL)
            .exec();

        return documents.map((document) => ({
            keyphrase: document.KeyPhrase,
            occurrences: document.Occurrences,
        }));
    }

    async storeKeyphrase(
        baseURL: string,
        occurrences: KeyphraseOccurrences
    ): Promise<boolean> {
        await this.model.create({
            BaseUrl: baseURL,
            KeyPhrase: occurrences.keyphrase,
            Occurrences: occurrences.occurrences,
        });

        return true;
    }
}

export default KeyphraseRepository;
