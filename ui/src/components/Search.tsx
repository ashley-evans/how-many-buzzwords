import React, { Fragment, useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { Navigate } from "react-router-dom";

import { URLInput } from "./URLInput";

const START_CRAWL_MUTATION = gql`
    mutation StartCrawl($input: StartCrawlInput!) {
        startCrawl(input: $input) {
            started
        }
    }
`;

type StartCrawlInput = {
    url: string;
};

type StartCrawlResult = {
    started: boolean;
};

function Search() {
    const [startCrawl, { data, loading, error }] = useMutation<
        { startCrawl: StartCrawlResult },
        { input: StartCrawlInput }
    >(START_CRAWL_MUTATION);
    const [crawledURL, setCrawledURL] = useState<URL | undefined>();

    const handleURLSubmit = async (validatedURL: URL) => {
        setCrawledURL(validatedURL);
        try {
            await startCrawl({
                variables: { input: { url: validatedURL.hostname } },
            });
        } catch {
            // Prevent promise rejection
        }
    };

    if (data?.startCrawl.started && crawledURL) {
        return (
            <Navigate
                to={`/results/${encodeURIComponent(crawledURL.toString())}`}
            />
        );
    }

    return (
        <Fragment>
            {!loading && <URLInput onURLSubmit={handleURLSubmit} />}
            {loading && <p>Initiating crawl...</p>}
            {error && (
                <p>
                    An error occurred when searching for buzzwords, please try
                    again.
                </p>
            )}
        </Fragment>
    );
}

export { Search, START_CRAWL_MUTATION };
