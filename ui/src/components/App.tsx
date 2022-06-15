import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CrawlServiceClient from "../clients/interfaces/CrawlServiceClient";
import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import Search from "./Search";

type AppProps = {
    crawlServiceClient: CrawlServiceClient;
    keyphraseServiceClientFactory: KeyphraseServiceClientFactory;
};

function App(props: AppProps) {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    index
                    element={
                        <Search crawlServiceClient={props.crawlServiceClient} />
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
