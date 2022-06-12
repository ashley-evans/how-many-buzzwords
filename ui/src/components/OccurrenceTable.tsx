import React, { Component, Fragment } from "react";
import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";

type OccurrenceTableProps = {
    occurrences: PathnameOccurrences[];
};

class OccurrenceTable extends Component<OccurrenceTableProps, unknown> {
    render(): React.ReactNode {
        return (
            <Fragment>
                <p>Awaiting results...</p>
            </Fragment>
        );
    }
}

export default OccurrenceTable;
