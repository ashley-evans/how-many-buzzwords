import { SiteKeyphraseOccurrences } from "buzzword-aws-keyphrase-service-keyphrase-repository-library";

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
    updateTotal(items: (OccurrenceItem | TotalItem)[]): Promise<boolean>;
}

export {
    OccurrenceTotalImage,
    OccurrenceItem,
    TotalOccurrencesPort,
    TotalItem,
};
