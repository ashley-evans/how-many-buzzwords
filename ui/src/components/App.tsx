import React, { Fragment, Suspense } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Spin } from "antd";

import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import SiteLayout from "./SiteLayout";

const Search = React.lazy(() => import("./Search"));
const Results = React.lazy(() => import("./Results"));

import "../css/App.css";

type AppProps = {
    keyphraseServiceClientFactory: KeyphraseServiceClientFactory;
};

const LOADING_MESSAGE = "Loading...";

function App(props: AppProps) {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<SiteLayout />}>
                    <Route
                        index
                        element={
                            <Suspense fallback={<Spin tip={LOADING_MESSAGE} />}>
                                <Search />
                            </Suspense>
                        }
                    />
                    <Route
                        path="results"
                        element={
                            <Suspense fallback={<Spin tip={LOADING_MESSAGE} />}>
                                <Results
                                    keyphraseServiceClientFactory={
                                        props.keyphraseServiceClientFactory
                                    }
                                />
                            </Suspense>
                        }
                    >
                        <Route
                            path=":url"
                            element={
                                <Suspense
                                    fallback={<Spin tip={LOADING_MESSAGE} />}
                                >
                                    <Results
                                        keyphraseServiceClientFactory={
                                            props.keyphraseServiceClientFactory
                                        }
                                    />
                                </Suspense>
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
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
