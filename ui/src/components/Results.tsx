import React, { Fragment, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button, Col, Row, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";
import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import KeyphraseCloud from "./KeyphraseCloud";
import ResultConstants from "../enums/Constants";

type ResultsProps = {
    keyphraseServiceClientFactory: KeyphraseServiceClientFactory;
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
    const [totals, setTotals] = useState<Record<string, number>>({});

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

    const results = Object.entries(occurrences).map(([key, occurrences]) => {
        const splitKey = key.split("#");
        return {
            pathname: splitKey[0],
            keyphrase: splitKey[1],
            occurrences,
        };
    });

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
            <Row>
                <Col span={24}>
                    {results.length == 0 && <p>Awaiting results...</p>}
                    {results.length != 0 && (
                        <Table
                            columns={columns}
                            dataSource={results}
                            rowKey={(record) =>
                                `${record.pathname}#${record.keyphrase}`
                            }
                            pagination={false}
                        />
                    )}
                </Col>
            </Row>
        </Fragment>
    );
}

export default Results;
