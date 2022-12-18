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
        const occurrenceUpdates = this.addOccurrences(totals.additions);
        const aggregateFlagUpdates = this.updateAggregateFlags(
            totals.unchanged
        );

        return (
            await Promise.all([occurrenceUpdates, aggregateFlagUpdates])
        ).every(Boolean);
    }

    private async addOccurrences(
        additions: SiteKeyphraseOccurrences[]
    ): Promise<boolean> {
        if (additions.length > 0) {
            try {
                return await this.repository.addOccurrencesToTotals(additions);
            } catch {
                return false;
            }
        }

        return true;
    }

    private async updateAggregateFlags(
        items: SiteKeyphrase[]
    ): Promise<boolean> {
        if (items.length > 0) {
            try {
                return await this.repository.setKeyphraseAggregated(items);
            } catch {
                return false;
            }
        }

        return true;
    }

    private createTotalUpdates(items: (OccurrenceItem | TotalItem)[]): {
        additions: SiteKeyphraseOccurrences[];
        unchanged: SiteKeyphrase[];
    } {
        const newAdditions: SiteKeyphraseOccurrences[] = [];
        const unchanged: SiteKeyphrase[] = [];

        for (const item of items) {
            if (this.isOccurrenceItem(item)) {
                if (item.current.aggregated) {
                    continue;
                }

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
                    unchanged.push({
                        baseURL: item.current.baseURL,
                        pathname: item.current.pathname,
                        keyphrase: item.current.keyphrase,
                    });
                }
            }
        }

        return {
            additions: newAdditions,
            unchanged: unchanged,
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
