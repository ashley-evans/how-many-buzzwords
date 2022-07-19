import React from "react";
import { ApolloProvider } from "@apollo/client";
import { Auth } from "@aws-amplify/auth";
import { createRoot } from "react-dom/client";

import CrawlGraphQLClientFactory from "./clients/factories/CrawlGraphQLClientFactory";
import KeyphraseServiceWSClientFactory from "./clients/factories/KeyphraseServiceWSClientFactory";

import App from "./components/App";

if (!process.env.REGION) {
    throw new Error("Application misconfigured: Missing AWS region");
}

if (!process.env.CRAWL_IDENTITY_POOL_ID) {
    throw new Error(
        "Application misconfigured: Missing crawl identity pool ID"
    );
}

Auth.configure({
    region: process.env.REGION,
    identityPoolId: process.env.CRAWL_IDENTITY_POOL_ID,
    mandatorySignIn: false,
});

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

if (!process.env.CRAWL_SERVICE_GRAPHQL_ENDPOINT) {
    throw new Error(
        "Application misconfigured: Missing crawl service GraphQL endpoint"
    );
}

const factory = new CrawlGraphQLClientFactory(
    process.env.CRAWL_SERVICE_GRAPHQL_ENDPOINT,
    process.env.REGION
);

const container = document.getElementById("root");
if (!container) {
    throw new Error("No root element found!");
}

const root = createRoot(container);
root.render(
    <ApolloProvider client={factory.createClient()}>
        <App keyphraseServiceClientFactory={keyphraseServiceClientFactory} />
    </ApolloProvider>
);
