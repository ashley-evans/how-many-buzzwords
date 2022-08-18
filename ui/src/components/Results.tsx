import React, { Fragment, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button, Col, Row, Typography } from "antd";

import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";
import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import OccurrenceTable from "./OccurrenceTable";
import KeyphraseCloud from "./KeyphraseCloud";

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

    try {
        const validatedURL = parseURL(url);

        useEffect(() => {
            const client =
                props.keyphraseServiceClientFactory.createClient(validatedURL);
            const observable = client.observeKeyphraseResults();
            observable.subscribe({
                next: (occurrence) => {
                    setOccurrences((previous) => [...previous, occurrence]);
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
                        <KeyphraseCloud occurrences={occurrences} />
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
