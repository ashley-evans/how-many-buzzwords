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

function Search() {
    const [startCrawl, { data, error }] = useMutation<
        { startCrawl: StartCrawlResult },
        { input: StartCrawlInput }
    >(START_CRAWL_MUTATION);
    const [crawledURL, setCrawledURL] = useState<URL | undefined>();
    const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | undefined>();

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

    const handleCrawlStatusUpdate = (status: CrawlStatus) => {
        setCrawlStatus(status);
        if (status == CrawlStatus.FAILED) {
            setCrawledURL(undefined);
        }
    };

    if (crawlStatus == CrawlStatus.COMPLETE && crawledURL) {
        return (
            <Navigate
                to={`/results/${encodeURIComponent(crawledURL.toString())}`}
            />
        );
    }

    return (
        <Fragment>
            {data?.startCrawl.started && crawledURL && (
                <CrawlingSpinner
                    onStatusUpdate={handleCrawlStatusUpdate}
                    url={crawledURL.hostname}
                />
            )}
            {(!data?.startCrawl.started ||
                crawlStatus == CrawlStatus.FAILED) && (
                <URLInput onURLSubmit={handleURLSubmit} />
            )}
            {(error || crawlStatus == CrawlStatus.FAILED) && (
                <p>
                    An error occurred when searching for buzzwords, please try
                    again.
                </p>
            )}
        </Fragment>
    );
}

export { Search, START_CRAWL_MUTATION };
