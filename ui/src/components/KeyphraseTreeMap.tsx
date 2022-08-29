import React, { Fragment } from "react";
import { Treemap } from "@ant-design/plots";

import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";
import ResultConstants from "../enums/Constants";

type KeyphraseTreeMapProps = {
    occurrences: PathnameOccurrences[];
};

function KeyphraseTreeMap(props: KeyphraseTreeMapProps) {
    const totalOccurrences = props.occurrences
        .filter((occurrence) => occurrence.pathname == ResultConstants.TOTAL)
        .map(({ keyphrase, occurrences }) => ({
            name: keyphrase,
            value: occurrences,
        }));

    const data = {
        name: "root",
        children: totalOccurrences,
    };

    return (
        <Fragment>
            {totalOccurrences.length == 0 && <p>Awaiting results...</p>}
            {totalOccurrences.length != 0 && (
                <figure>
                    <Treemap data={data} colorField="name" renderer="svg" />
                </figure>
            )}
        </Fragment>
    );
}

export default KeyphraseTreeMap;
