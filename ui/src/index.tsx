import React from "react";
import { createRoot } from "react-dom/client";

import App from "./components/App";

const crawlServiceEndpoint = new URL(
    "https://vcv01m9s3b.execute-api.eu-west-2.amazonaws.com/"
);

const container = document.getElementById("root");
if (!container) {
    throw new Error("No root element found!");
}
const root = createRoot(container);
root.render(<App crawlServiceEndpoint={crawlServiceEndpoint} />);
