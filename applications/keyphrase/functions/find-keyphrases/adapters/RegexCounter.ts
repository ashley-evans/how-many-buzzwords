import OccurrenceCounter from "../ports/OccurrenceCounter";

class RegexCounter implements OccurrenceCounter {
    countOccurrences(text: string, match: string): number {
        const occuranceExpression = new RegExp(
            `\\b${match}\\b`,
            'gi'
        );

        const matches = text.match(occuranceExpression);

        return matches ? matches.length : 0;
    }
}

export default RegexCounter;
