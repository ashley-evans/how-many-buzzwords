import React, { Fragment } from "react";

import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";
import ResultConstants from "../enums/Constants";

type KeyphraseTreeMapProps = {
    occurrences: PathnameOccurrences[];
};

function KeyphraseTreeMap(props: KeyphraseTreeMapProps) {
    const totalOccurrences = props.occurrences.filter(
        (occurrence) => occurrence.pathname == ResultConstants.TOTAL
    );

    return (
        <Fragment>
            {totalOccurrences.length == 0 && <p>Awaiting results...</p>}
            {totalOccurrences.length != 0 && <figure />}
        </Fragment>
    );
}

export default KeyphraseTreeMap;
