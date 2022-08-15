import React, { Fragment } from "react";
import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";

type KeyphraseCloudProps = {
    occurrences: PathnameOccurrences[];
};

function KeyphraseCloud(props: KeyphraseCloudProps) {
    return (
        <Fragment>
            {props.occurrences.length == 0 && <p>Awaiting results...</p>}
        </Fragment>
    );
}

export default KeyphraseCloud;
