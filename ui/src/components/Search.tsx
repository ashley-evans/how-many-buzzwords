import React, { Component, Fragment } from "react";

import CrawlServiceClient from "../clients/interfaces/CrawlServiceClient";
import { URLInput } from "./URLInput";

const ERROR_MESSAGE =
    "An error occurred when searching for buzzwords, please try again.";

type SearchProps = {
    crawlServiceClient: CrawlServiceClient;
};

type SearchState = {
    initiatingCrawl: boolean;
    errorMessage: string;
};

class Search extends Component<SearchProps, SearchState> {
    state: SearchState = {
        initiatingCrawl: false,
        errorMessage: "",
    };

    constructor(props: SearchProps) {
        super(props);
        this.handleURLSubmit = this.handleURLSubmit.bind(this);
    }

    async handleURLSubmit(validatedURL: URL) {
        this.setState({ initiatingCrawl: true, errorMessage: "" });

        let crawlInitiated = false;
        try {
            crawlInitiated = await this.props.crawlServiceClient.crawl(
                validatedURL
            );
        } catch {
            this.setState({
                errorMessage: ERROR_MESSAGE,
            });
        }

        this.setState({ initiatingCrawl: false });
        if (!crawlInitiated) {
            this.setState({
                errorMessage: ERROR_MESSAGE,
            });
        }
    }

    render(): React.ReactNode {
        return (
            <Fragment>
                <h1>How many buzzwords</h1>
                {!this.state.initiatingCrawl && (
                    <URLInput onURLSubmit={this.handleURLSubmit} />
                )}
                {this.state.initiatingCrawl && <p>Initiating crawl...</p>}
                {this.state.errorMessage != "" && (
                    <p>{this.state.errorMessage}</p>
                )}
            </Fragment>
        );
    }
}

export default Search;
