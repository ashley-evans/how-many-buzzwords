import React, { Fragment, useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { Navigate } from "react-router-dom";

import { URLInput } from "./URLInput";
import { CrawlingSpinner } from "./CrawlingSpinner";
import CrawlStatus from "../enums/CrawlStatus";

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

type SearchState = {
    crawledURL?: URL;
    crawlStatus?: CrawlStatus;
};

function Search() {
    const [startCrawl, { data, loading, error }] = useMutation<
        { startCrawl: StartCrawlResult },
        { input: StartCrawlInput }
    >(START_CRAWL_MUTATION);
    const [state, setState] = useState<SearchState>();

    const handleURLSubmit = async (validatedURL: URL) => {
        setState({
            crawledURL: validatedURL,
        });

        try {
            await startCrawl({
                variables: { input: { url: validatedURL.hostname } },
            });
        } catch {
            // Prevent promise rejection
        }
    };

    const handleCrawlStatusUpdate = (status: CrawlStatus) => {
        setState({
            ...state,
            crawlStatus: status,
        });
    };

    if (state?.crawlStatus == CrawlStatus.COMPLETE && state.crawledURL) {
        return (
            <Navigate
                to={`/results/${encodeURIComponent(
                    state.crawledURL.toString()
                )}`}
            />
        );
    }

    return (
        <Fragment>
            {(loading || data?.startCrawl.started) &&
                state?.crawledURL &&
                state.crawlStatus != CrawlStatus.FAILED && (
                    <CrawlingSpinner
                        onStatusUpdate={handleCrawlStatusUpdate}
                        url={state.crawledURL.hostname}
                    />
                )}
            {((!loading && !data?.startCrawl.started) ||
                state?.crawlStatus == CrawlStatus.FAILED) && (
                <URLInput onURLSubmit={handleURLSubmit} />
            )}
            {(error || state?.crawlStatus == CrawlStatus.FAILED) && (
                <p>
                    An error occurred when searching for buzzwords, please try
                    again.
                </p>
            )}
        </Fragment>
    );
}

export { Search, START_CRAWL_MUTATION };
