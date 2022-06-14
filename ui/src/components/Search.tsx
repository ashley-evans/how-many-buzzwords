import React, { Component, Fragment } from "react";
import CrawlServiceClient from "../clients/interfaces/CrawlServiceClient";
import { URLInput } from "./URLInput";

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

    async handleURLSubmit() {
        this.setState({ initiatingCrawl: true });
    }

    render(): React.ReactNode {
        return (
            <Fragment>
                <h1>How many buzzwords</h1>
                {!this.state.initiatingCrawl && (
                    <URLInput onURLSubmit={this.handleURLSubmit} />
                )}
                {this.state.initiatingCrawl && <p>Initiating crawl...</p>}
            </Fragment>
        );
    }
}

export default Search;
