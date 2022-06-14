import React, { Component, Fragment } from "react";
import CrawlServiceClient from "../clients/interfaces/CrawlServiceClient";
import { URLInput } from "./URLInput";

type SearchProps = {
    crawlServiceClient: CrawlServiceClient;
};

type SearchState = {
    errorMessage: string;
};

class Search extends Component<SearchProps, SearchState> {
    state: SearchState = {
        errorMessage: "",
    };

    constructor(props: SearchProps) {
        super(props);
    }

    async handleURLSubmit(validatedURL: URL) {
        throw new Error(validatedURL.toString());
    }

    render(): React.ReactNode {
        return (
            <Fragment>
                <h1>How many buzzwords</h1>
                <URLInput onURLSubmit={this.handleURLSubmit} />
            </Fragment>
        );
    }
}

export default Search;
