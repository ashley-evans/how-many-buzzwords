import React from "react";
import { createRoot } from "react-dom/client";
import CrawlServiceAxiosClient from "./clients/CrawlServiceAxiosClient";
import KeyphraseServiceWSClientFactory from "./clients/factories/KeyphraseServiceWSClientFactory";

import App from "./components/App";

const crawlServiceEndpoint = new URL(
    "https://vcv01m9s3b.execute-api.eu-west-2.amazonaws.com/"
);
const crawlServiceClient = new CrawlServiceAxiosClient(crawlServiceEndpoint);

const keyphraseServiceEndpoint = new URL(
    "wss://peeam3kix4.execute-api.eu-west-2.amazonaws.com/$default/"
);
const keyphraseServiceClientFactory = new KeyphraseServiceWSClientFactory(
    keyphraseServiceEndpoint
);

const container = document.getElementById("root");
if (!container) {
    throw new Error("No root element found!");
}
const root = createRoot(container);
root.render(
    <App
        crawlServiceClient={crawlServiceClient}
        keyphraseServiceClientFactory={keyphraseServiceClientFactory}
    />
);
