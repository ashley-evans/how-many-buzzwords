import { SiteKeyphraseOccurrences } from "buzzword-aws-keyphrase-repository-library";

type KeyphraseOccurrencesItem = {
    current: SiteKeyphraseOccurrences;
    previous?: SiteKeyphraseOccurrences;
};

interface TotalOccurrencesPort {
    updateTotal(items: KeyphraseOccurrencesItem[]): Promise<boolean>;
}

export { KeyphraseOccurrencesItem, TotalOccurrencesPort };
