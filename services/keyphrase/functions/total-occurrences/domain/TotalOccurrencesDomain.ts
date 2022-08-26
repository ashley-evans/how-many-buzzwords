import {
    Repository,
    SiteKeyphraseOccurrences,
} from "buzzword-aws-keyphrase-repository-library";

import {
    OccurrenceItem,
    TotalItem,
    TotalOccurrencesPort,
} from "../ports/TotalOccurrencesPort";

class TotalOccurrencesDomain implements TotalOccurrencesPort {
    constructor(private repository: Repository) {}

    async updateTotal(items: (OccurrenceItem | TotalItem)[]): Promise<boolean> {
        const occurrencesToTotal: SiteKeyphraseOccurrences[] = items.reduce(
            (acc: SiteKeyphraseOccurrences[], item) => {
                if (this.isOccurrenceItem(item)) {
                    const newOccurrences = item.previous
                        ? item.current.occurrences - item.previous.occurrences
                        : item.current.occurrences;

                    acc.push({
                        baseURL: item.current.baseURL,
                        pathname: item.current.pathname,
                        keyphrase: item.current.keyphrase,
                        occurrences: newOccurrences,
                    });
                }

                return acc;
            },
            []
        );

        if (occurrencesToTotal.length == 0) {
            return true;
        }

        try {
            return await this.repository.addOccurrencesToTotals(
                occurrencesToTotal
            );
        } catch {
            return false;
        }
    }

    private isOccurrenceItem(
        item: OccurrenceItem | TotalItem
    ): item is OccurrenceItem {
        const occurrence = item as OccurrenceItem;
        return (
            occurrence.current.baseURL !== undefined &&
            occurrence.current.pathname !== undefined
        );
    }
}

export default TotalOccurrencesDomain;
