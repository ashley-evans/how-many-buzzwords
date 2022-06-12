import React, { Component, Fragment } from "react";
import { URLInput } from "./URLInput";

type AppProps = {
    crawlServiceEndpoint: URL;
};

type AppState = {
    baseURL: URL | undefined;
    crawling: boolean;
};

class App extends Component<AppProps, AppState> {
    state: AppState = {
        baseURL: undefined,
        crawling: false,
    };

    constructor(props: AppProps) {
        super(props);
        this.handleURLSubmit = this.handleURLSubmit.bind(this);
    }

    handleURLSubmit = async (validatedURL: URL) => {
        this.setState({ baseURL: validatedURL, crawling: true });
    };

    render() {
        return (
            <Fragment>
                <h1>How many buzzwords</h1>
                {!this.state.crawling && (
                    <URLInput onURLSubmit={this.handleURLSubmit} />
                )}
                {this.state.crawling && <p>Crawling...</p>}
            </Fragment>
        );
    }
}

export default App;
