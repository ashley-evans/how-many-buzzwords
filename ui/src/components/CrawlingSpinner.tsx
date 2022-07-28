import React, { Fragment } from "react";
import { gql, useSubscription } from "@apollo/client";

import CrawlStatus from "../enums/CrawlStatus";

type CrawlingSpinnerProps = {
    url: string;
};

type CrawlStatusUpdate = {
    status: CrawlStatus;
};

const CRAWL_STATUS_UPDATE_SUBSCRIPTION = gql`
    subscription CrawlStatusUpdated($url: ID!) {
        crawlStatusUpdated(id: $url) {
            status
        }
    }
`;

function CrawlingSpinner(props: CrawlingSpinnerProps) {
    useSubscription<{ crawlStatusUpdated: CrawlStatusUpdate }, { url: string }>(
        CRAWL_STATUS_UPDATE_SUBSCRIPTION,
        { variables: { url: props.url } }
    );

    return <Fragment />;
}

export { CrawlingSpinner, CRAWL_STATUS_UPDATE_SUBSCRIPTION };
