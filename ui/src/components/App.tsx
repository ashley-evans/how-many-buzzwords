import React, { Fragment, ReactElement, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Spin, Typography } from "antd";

import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import SiteLayout from "./SiteLayout";
import ButtonLink from "./ButtonLink";

const Search = React.lazy(() => import("./Search"));
const Results = React.lazy(() => import("./Results"));

type AppProps = {
    keyphraseServiceClientFactory: KeyphraseServiceClientFactory;
};

type LazyLoadingProps = {
    children: ReactElement;
};

function LazyLoadingWrapper(props: LazyLoadingProps): ReactElement {
    return (
        <Suspense fallback={<Spin tip="Loading..." />}>
            {props.children}
        </Suspense>
    );
}

function App(props: AppProps) {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<SiteLayout />}>
                    <Route
                        index
                        element={
                            <LazyLoadingWrapper>
                                <Search />
                            </LazyLoadingWrapper>
                        }
                    />
                    <Route
                        path="results"
                        element={
                            <LazyLoadingWrapper>
                                <Results
                                    keyphraseServiceClientFactory={
                                        props.keyphraseServiceClientFactory
                                    }
                                />
                            </LazyLoadingWrapper>
                        }
                    >
                        <Route
                            path=":url"
                            element={
                                <LazyLoadingWrapper>
                                    <Results
                                        keyphraseServiceClientFactory={
                                            props.keyphraseServiceClientFactory
                                        }
                                    />
                                </LazyLoadingWrapper>
                            }
                        />
                    </Route>
                    <Route
                        path="*"
                        element={
                            <Fragment>
                                <Typography.Paragraph>
                                    Oh no! You&apos;ve gotten lost!
                                </Typography.Paragraph>
                                <ButtonLink type="primary" to="/">
                                    Return to search
                                </ButtonLink>
                            </Fragment>
                        }
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
