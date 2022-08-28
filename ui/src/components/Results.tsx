import React, { Fragment, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button, Col, Row, Typography } from "antd";

import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";
import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import OccurrenceTable from "./OccurrenceTable";
import KeyphraseCloud from "./KeyphraseCloud";
import ResultConstants from "../enums/Constants";

type ResultsProps = {
    keyphraseServiceClientFactory: KeyphraseServiceClientFactory;
};

function parseURL(url?: string): URL {
    if (!url) {
        throw new Error("Invalid URL.");
    }

    return new URL(url);
}

function Results(props: ResultsProps) {
    const { url } = useParams();
    const [occurrences, setOccurrences] = useState<PathnameOccurrences[]>([]);
    const [totals, setTotals] = useState<Record<string, number>>({});

    try {
        const validatedURL = parseURL(url);

        useEffect(() => {
            const client =
                props.keyphraseServiceClientFactory.createClient(validatedURL);
            const observable = client.observeKeyphraseResults();
            observable.subscribe({
                next: (occurrence) => {
                    setOccurrences((previous) => [...previous, occurrence]);
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
                        <OccurrenceTable occurrences={occurrences} />
                    </Col>
                </Row>
            </Fragment>
        );
    } catch {
        return <Navigate to="/" />;
    }
}

export default Results;
