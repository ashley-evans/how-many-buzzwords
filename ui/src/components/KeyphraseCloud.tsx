import React, { Fragment } from "react";
import { WordCloud, WordCloudConfig } from "@ant-design/plots";

type KeyphraseCloudProps = {
    occurrences: Record<string, number>;
};

function KeyphraseCloud(props: KeyphraseCloudProps) {
    const occurrences = Object.entries(props.occurrences).map(
        ([keyphrase, occurrences]) => ({ keyphrase, occurrences })
    );

    const config: WordCloudConfig = {
        data: occurrences,
        wordField: "keyphrase",
        weightField: "occurrences",
        colorField: "keyphrase",
        autoFit: false,
        renderer: "svg",
    };

    return (
        <Fragment>
            {occurrences.length == 0 && <p>Awaiting results...</p>}
            {occurrences.length != 0 && (
                <figure>
                    <WordCloud {...config} />
                </figure>
            )}
        </Fragment>
    );
}

export default KeyphraseCloud;
