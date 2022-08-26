import { Repository } from "buzzword-aws-keyphrase-repository-library";

import {
    KeyphraseOccurrencesItem,
    TotalOccurrencesPort,
} from "../ports/TotalOccurrencesPort";

class TotalOccurrencesDomain implements TotalOccurrencesPort {
    constructor(private repository: Repository) {}

    async updateTotal(items: KeyphraseOccurrencesItem[]): Promise<boolean> {
        if (items.length == 0) {
            return true;
        }

        await this.repository.addOccurrencesToTotals(items[0].current);
        return true;
    }
}

export default TotalOccurrencesDomain;
