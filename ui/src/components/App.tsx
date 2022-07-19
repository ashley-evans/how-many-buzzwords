import React, { Fragment } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import CrawlServiceClient from "../clients/interfaces/CrawlServiceClient";
import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import Results from "./Results";
import { Search } from "./Search";

type AppProps = {
    crawlServiceClient: CrawlServiceClient;
    keyphraseServiceClientFactory: KeyphraseServiceClientFactory;
};

function App(props: AppProps) {
    return (
        <BrowserRouter>
            <Routes>
                <Route index element={<Search />} />
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
                <Route
                    path="*"
                    element={
                        <Fragment>
                            <p>Oh no! You&apos;ve gotten lost!</p>
                            <Link to="/">Return to search</Link>
                        </Fragment>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
