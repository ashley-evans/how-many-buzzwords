import React, { Fragment, useEffect, useState, ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button, Col, Row, Table, Typography, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";

import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";
import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import KeyphraseCloud from "./KeyphraseCloud";
import ResultConstants from "../enums/Constants";

type ResultsProps = {
    keyphraseServiceClientFactory: KeyphraseServiceClientFactory;
};

type OccurrenceRow = PathnameOccurrences & { key: ReactNode };
type GroupedOccurrences = Omit<OccurrenceRow, "pathname"> & {
    children?: Omit<OccurrenceRow, "keyphrase">[];
};

const columns: ColumnsType<GroupedOccurrences> = [
    {
        title: "Keyphrase",
        dataIndex: "keyphrase",
        key: "keyphrase",
        width: "25%",
    },
    {
        title: "Pathname",
        dataIndex: "pathname",
        key: "pathname",
        width: "60%",
    },
    {
        title: "Occurrences",
        dataIndex: "occurrences",
        key: "occurrences",
    },
];

function groupOccurrences(
    occurrences: Record<OccurrenceKey, number>
): GroupedOccurrences[] {
    const totals: Record<string, number> = {};
    const groups = Object.entries(occurrences).reduce(
        (
            groups: Record<string, Omit<OccurrenceRow, "keyphrase">[]>,
            [key, occurrences]
        ) => {
            const [pathname, keyphrase] = key.split("#");
            if (!groups[keyphrase]) {
                groups[keyphrase] = [];
            }

            if (pathname == ResultConstants.TOTAL) {
                totals[keyphrase] = occurrences;
            } else {
                groups[keyphrase].push({
                    key: `${pathname}#${keyphrase}`,
                    pathname,
                    occurrences,
                });
            }

            return groups;
        },
        {}
    );

    return Object.entries(totals).map(([keyphrase, occurrences]) => ({
        key: keyphrase,
        keyphrase,
        occurrences,
        children: groups[keyphrase],
    }));
}

function parseURL(url?: string): URL {
    if (!url) {
        throw new Error("Invalid URL.");
    }

    return new URL(url);
}

type OccurrenceKey = `${string}#${string}`;

function Results(props: ResultsProps) {
    const { url } = useParams();
    const [occurrences, setOccurrences] = useState<
        Record<OccurrenceKey, number>
    >({});
    const [totals, setTotals] = useState<Record<OccurrenceKey, number>>({});

    let validatedURL: URL;
    try {
        validatedURL = parseURL(url);
    } catch {
        return <Navigate to="/" />;
    }

    useEffect(() => {
        const client =
            props.keyphraseServiceClientFactory.createClient(validatedURL);
        const observable = client.observeKeyphraseResults();
        observable.subscribe({
            next: (occurrence) => {
                setOccurrences((previous) => ({
                    ...previous,
                    [`${occurrence.pathname}#${occurrence.keyphrase}`]:
                        occurrence.occurrences,
                }));

                if (occurrence.pathname == ResultConstants.TOTAL) {
                    setTotals((previous) => ({
                        ...previous,
                        [occurrence.keyphrase]: occurrence.occurrences,
                    }));
                }
            },
        });

        return () => {
            client.disconnect();
        };
    }, []);

    const groupedResults = groupOccurrences(occurrences);

    return (
        <Fragment>
            <Row>
                <Col flex={9}>
                    <Typography.Title
                        level={2}
                    >{`Results for: ${validatedURL}`}</Typography.Title>
                </Col>
                <Col flex={1}>
                    <Button>
                        <Link to="/">Return to search</Link>
                    </Button>
                </Col>
            </Row>
            <Row>
                <Col flex="1 1 500px" />
                <Col flex="1 0 500px">
                    <KeyphraseCloud occurrences={totals} />
                </Col>
            </Row>
            <Row style={{ marginTop: "5px" }}>
                <Col span={24}>
                    <Table
                        columns={columns}
                        dataSource={groupedResults}
                        pagination={false}
                        locale={{
                            emptyText: (
                                <Empty
                                    description={
                                        <span>Awaiting results...</span>
                                    }
                                />
                            ),
                        }}
                    />
                </Col>
            </Row>
        </Fragment>
    );
}

export default Results;
