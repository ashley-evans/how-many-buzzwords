import React, { Fragment, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";
import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import OccurrenceTable from "./OccurrenceTable";

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
                <Link to="/">Return to search</Link>
                <h2>{`Results for: ${validatedURL}`}</h2>
                <OccurrenceTable occurrences={occurrences} />
            </Fragment>
        );
    } catch {
        return <Navigate to="/" />;
    }
}

export default Results;
