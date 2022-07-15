import React, { Fragment, useState } from "react";
import { Navigate } from "react-router-dom";

import CrawlServiceClient from "../clients/interfaces/CrawlServiceClient";
import { URLInput } from "./URLInput";

const ERROR_MESSAGE =
    "An error occurred when searching for buzzwords, please try again.";

type SearchProps = {
    crawlServiceClient: CrawlServiceClient;
};

function Search(props: SearchProps) {
    const [initiatingCrawl, setInititatingCrawl] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [crawledURL, setCrawledURL] = useState<URL | undefined>();

    const handleURLSubmit = async (validatedURL: URL) => {
        setInititatingCrawl(true);
        setErrorMessage("");

        let crawlInitiated = false;
        try {
            crawlInitiated = await props.crawlServiceClient.crawl(validatedURL);
        } catch {
            setErrorMessage(ERROR_MESSAGE);
        }

        setInititatingCrawl(false);
        if (crawlInitiated) {
            setCrawledURL(validatedURL);
        } else {
            setErrorMessage(ERROR_MESSAGE);
        }
    };

    if (crawledURL) {
        return (
            <Navigate
                to={`/results/${encodeURIComponent(crawledURL.toString())}`}
            />
        );
    }

    return (
        <Fragment>
            <h1>How many buzzwords</h1>
            {!initiatingCrawl && <URLInput onURLSubmit={handleURLSubmit} />}
            {initiatingCrawl && <p>Initiating crawl...</p>}
            {errorMessage != "" && <p>{errorMessage}</p>}
        </Fragment>
    );
}

export default Search;
