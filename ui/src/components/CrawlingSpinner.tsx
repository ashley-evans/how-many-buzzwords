import React, { useEffect } from "react";
import { gql, useSubscription } from "@apollo/client";
import { Spin } from "antd";

import CrawlStatus from "../enums/CrawlStatus";

type CrawlingSpinnerProps = {
    url: string;
    onStatusUpdate: (status: CrawlStatus) => unknown;
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
    const { data } = useSubscription<
        { crawlStatusUpdated: CrawlStatusUpdate },
        { url: string }
    >(CRAWL_STATUS_UPDATE_SUBSCRIPTION, { variables: { url: props.url } });

    useEffect(() => {
        if (data?.crawlStatusUpdated.status) {
            props.onStatusUpdate(data.crawlStatusUpdated.status);
        }
    }, [data]);

    return <Spin tip="Crawling..." />;
}

export { CrawlingSpinner, CRAWL_STATUS_UPDATE_SUBSCRIPTION };
