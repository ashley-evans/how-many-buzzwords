import React, { Fragment } from "react";
import { WordCloud, WordCloudConfig } from "@ant-design/plots";
import { Empty } from "antd";

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
            {occurrences.length == 0 && (
                <Empty description={<span>Awaiting results...</span>} />
            )}
            {occurrences.length != 0 && (
                <figure>
                    <WordCloud {...config} />
                </figure>
            )}
        </Fragment>
    );
}

export default KeyphraseCloud;
