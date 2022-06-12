import React from "react";
import { createRoot } from "react-dom/client";
import CrawlServiceAxiosClient from "./clients/CrawlServiceAxiosClient";
import KeyphraseServiceWSClientFactory from "./clients/factories/KeyphraseServiceWSClientFactory";

import App from "./components/App";

if (!process.env.CRAWL_SERVICE_ENDPOINT) {
    throw new Error(
        "Application misconfigured: Missing crawl service endpoint"
    );
}
const crawlServiceEndpoint = new URL(process.env.CRAWL_SERVICE_ENDPOINT);
const crawlServiceClient = new CrawlServiceAxiosClient(crawlServiceEndpoint);

if (!process.env.KEYPHRASE_WS_SERVICE_ENDPOINT) {
    throw new Error(
        "Application misconfigured: Missing keyphrase service endpoint"
    );
}
const keyphraseServiceEndpoint = new URL(
    process.env.KEYPHRASE_WS_SERVICE_ENDPOINT
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
