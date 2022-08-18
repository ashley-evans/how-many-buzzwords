import React, { Fragment } from "react";
import { WordCloud, WordCloudConfig } from "@ant-design/plots";

import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";

type KeyphraseCloudProps = {
    occurrences: PathnameOccurrences[];
};

function sumUniqueOccurrences(
    occurrences: PathnameOccurrences[]
): Omit<PathnameOccurrences, "pathname">[] {
    const result = occurrences.reduce((unique, current) => {
        const currentTotal = unique.get(current.keyphrase);
        unique.set(
            current.keyphrase,
            currentTotal
                ? currentTotal + current.occurrences
                : current.occurrences
        );

        return unique;
    }, new Map<string, number>());

    return Array.from(result, ([keyphrase, occurrences]) => ({
        keyphrase,
        occurrences,
    }));
}

function KeyphraseCloud(props: KeyphraseCloudProps) {
    const config: WordCloudConfig = {
        data: sumUniqueOccurrences(props.occurrences),
        wordField: "keyphrase",
        weightField: "occurrences",
        colorField: "keyphrase",
        autoFit: false,
        renderer: "svg",
    };

    return (
        <Fragment>
            {props.occurrences.length == 0 && <p>Awaiting results...</p>}
            {props.occurrences.length != 0 && (
                <figure>
                    <WordCloud {...config} />
                </figure>
            )}
        </Fragment>
    );
}

export default KeyphraseCloud;
