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

        const currentOccurrences = items.map((item) => item.current);
        try {
            return await this.repository.addOccurrencesToTotals(
                currentOccurrences
            );
        } catch {
            return false;
        }
    }
}

export default TotalOccurrencesDomain;
