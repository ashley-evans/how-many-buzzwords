import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CrawlServiceClient from "../clients/interfaces/CrawlServiceClient";
import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import Results from "./Results";
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
                <Route
                    path="results"
                    element={
                        <Results
                            keyphraseServiceClientFactory={
                                props.keyphraseServiceClientFactory
                            }
                        />
                    }
                >
                    <Route
                        path=":url"
                        element={
                            <Results
                                keyphraseServiceClientFactory={
                                    props.keyphraseServiceClientFactory
                                }
                            />
                        }
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
