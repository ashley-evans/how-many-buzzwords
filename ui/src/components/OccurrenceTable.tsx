import React, { Fragment } from "react";
import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";

type OccurrenceTableProps = {
    occurrences: PathnameOccurrences[];
};

function OccurrenceTable(props: OccurrenceTableProps) {
    return (
        <Fragment>
            {props.occurrences.length == 0 && <p>Awaiting results...</p>}
            {props.occurrences.length != 0 && (
                <table role="grid">
                    <thead>
                        <tr role="row">
                            <th role="columnheader" scope="col">
                                Pathname
                            </th>
                            <th role="columnheader" scope="col">
                                Keyphrase
                            </th>
                            <th role="columnheader" scope="col">
                                Occurrences
                            </th>
                        </tr>
                        {props.occurrences.map((occurrence) => (
                            <tr
                                role="row"
                                key={`${occurrence.pathname}#${occurrence.keyphrase}`}
                            >
                                <td>{occurrence.pathname}</td>
                                <td>{occurrence.keyphrase}</td>
                                <td>{occurrence.occurrences}</td>
                            </tr>
                        ))}
                    </thead>
                </table>
            )}
        </Fragment>
    );
}

export default OccurrenceTable;
