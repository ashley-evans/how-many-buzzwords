import React, { Fragment } from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";

import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";

type OccurrenceTableProps = {
    occurrences: PathnameOccurrences[];
};

const columns: ColumnsType<PathnameOccurrences> = [
    {
        title: "Pathname",
        dataIndex: "pathname",
        key: "pathname",
    },
    {
        title: "Keyphrase",
        dataIndex: "keyphrase",
        key: "keyphrase",
    },
    {
        title: "Occurrences",
        dataIndex: "occurrences",
        key: "occurrences",
    },
];

function OccurrenceTable(props: OccurrenceTableProps) {
    return (
        <Fragment>
            {props.occurrences.length == 0 && <p>Awaiting results...</p>}
            {props.occurrences.length != 0 && (
                <Table
                    columns={columns}
                    dataSource={props.occurrences}
                    rowKey={(record) =>
                        `${record.pathname}#${record.keyphrase}`
                    }
                />
            )}
        </Fragment>
    );
}

export default OccurrenceTable;
