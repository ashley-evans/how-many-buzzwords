import React, { Component, Fragment } from "react";
import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";

type OccurrenceTableProps = {
    baseURL: URL;
    occurrences: PathnameOccurrences[];
};

class OccurrenceTable extends Component<OccurrenceTableProps, unknown> {
    render(): React.ReactNode {
        return (
            <Fragment>
                <h2>{`Results for: ${this.props.baseURL.toString()}`}</h2>
                {this.props.occurrences.length == 0 && (
                    <p>Awaiting results...</p>
                )}
            </Fragment>
        );
    }
}

export default OccurrenceTable;
