import {
    SiteKeyphrase,
    SiteKeyphraseOccurrences,
} from "buzzword-keyphrase-keyphrase-repository-library";

type OccurrenceTotalImage = {
    baseURL?: string;
    keyphrase: string;
    occurrences: number;
};

type ItemState<T> = {
    current: T;
    previous?: T;
};

type OccurrenceItem = ItemState<SiteKeyphraseOccurrences>;
type TotalItem = ItemState<OccurrenceTotalImage>;

interface TotalOccurrencesPort {
    updateTotal(
        items: (OccurrenceItem | TotalItem)[]
    ): Promise<SiteKeyphrase[]>;
}

export {
    OccurrenceTotalImage,
    OccurrenceItem,
    TotalOccurrencesPort,
    TotalItem,
};
