import {
    Repository,
    SiteKeyphraseOccurrences,
    SiteKeyphrase,
} from "buzzword-keyphrase-keyphrase-repository-library";

import {
    OccurrenceItem,
    TotalItem,
    TotalOccurrencesPort,
} from "../ports/TotalOccurrencesPort";

class TotalOccurrencesDomain implements TotalOccurrencesPort {
    constructor(private repository: Repository) {}

    async updateTotal(items: (OccurrenceItem | TotalItem)[]): Promise<boolean> {
        const totals = this.createTotalUpdates(items);

        let result = true;
        if (totals.additions.length > 0) {
            result = await this.addOccurrences(totals.additions);
        }

        if (totals.aggregated.length > 0) {
            result = await this.updateAggregateFlags(totals.aggregated);
        }

        return result;
    }

    private async addOccurrences(
        additions: SiteKeyphraseOccurrences[]
    ): Promise<boolean> {
        try {
            return await this.repository.addOccurrencesToTotals(additions);
        } catch {
            return false;
        }
    }

    private async updateAggregateFlags(
        items: SiteKeyphrase[]
    ): Promise<boolean> {
        return await this.repository.setKeyphraseAggregated(items);
    }

    private createTotalUpdates(items: (OccurrenceItem | TotalItem)[]): {
        additions: SiteKeyphraseOccurrences[];
        aggregated: SiteKeyphrase[];
    } {
        const newAdditions: SiteKeyphraseOccurrences[] = [];
        const alreadyAggregated: SiteKeyphrase[] = [];

        for (const item of items) {
            if (this.isOccurrenceItem(item)) {
                const newOccurrences = item.previous
                    ? item.current.occurrences - item.previous.occurrences
                    : item.current.occurrences;

                if (newOccurrences != 0) {
                    newAdditions.push({
                        baseURL: item.current.baseURL,
                        pathname: item.current.pathname,
                        keyphrase: item.current.keyphrase,
                        occurrences: newOccurrences,
                    });
                } else {
                    alreadyAggregated.push({
                        baseURL: item.current.baseURL,
                        pathname: item.current.pathname,
                        keyphrase: item.current.keyphrase,
                    });
                }
            }
        }

        return {
            additions: newAdditions,
            aggregated: alreadyAggregated,
        };
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
