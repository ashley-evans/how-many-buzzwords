import React, { Component, Fragment } from "react";
import CrawlServiceClient from "../clients/interfaces/CrawlServiceClient";
import { PathnameOccurrences } from "../clients/interfaces/KeyphraseServiceClient";
import KeyphraseServiceClientFactory from "../clients/interfaces/KeyphraseServiceClientFactory";
import OccurrenceTable from "./OccurrenceTable";
import { URLInput } from "./URLInput";

type AppProps = {
    crawlServiceClient: CrawlServiceClient;
    keyphraseServiceClientFactory: KeyphraseServiceClientFactory;
};

type AppState = {
    baseURL: URL | undefined;
    crawling: boolean;
    errorMessage: string;
    occurrences: PathnameOccurrences[] | undefined;
};

class App extends Component<AppProps, AppState> {
    state: AppState = {
        baseURL: undefined,
        crawling: false,
        errorMessage: "",
        occurrences: undefined,
    };

    constructor(props: AppProps) {
        super(props);
        this.handleURLSubmit = this.handleURLSubmit.bind(this);
    }

    handleURLSubmit = async (validatedURL: URL) => {
        this.setState({
            baseURL: validatedURL,
            crawling: true,
            errorMessage: "",
        });
        let crawlStarted: boolean | undefined = undefined;
        try {
            crawlStarted = await this.props.crawlServiceClient.crawl(
                validatedURL
            );
        } catch {
            this.setState({
                errorMessage:
                    "An error occurred when searching for buzzwords, please try again.",
            });
        }

        this.setState({ crawling: false });
        if (crawlStarted) {
            this.setState({ occurrences: [] });
            const client =
                this.props.keyphraseServiceClientFactory.createClient(
                    validatedURL
                );
            const observable = client.observeKeyphraseResults();
            observable.subscribe({
                next: (occurrence) => {
                    this.setState((state) => {
                        const currentOccurrences = state.occurrences
                            ? state.occurrences
                            : [];
                        return {
                            occurrences: [...currentOccurrences, occurrence],
                        };
                    });
                },
            });
        } else {
            this.setState({
                errorMessage:
                    "An error occurred when searching for buzzwords, please try again.",
            });
        }
    };

    render() {
        return (
            <Fragment>
                <h1>How many buzzwords</h1>
                {!this.state.crawling && (
                    <URLInput onURLSubmit={this.handleURLSubmit} />
                )}
                {this.state.crawling && <p>Crawling...</p>}
                {this.state.errorMessage != "" && (
                    <p>{this.state.errorMessage}</p>
                )}
                {this.state.occurrences && this.state.baseURL && (
                    <OccurrenceTable
                        baseURL={this.state.baseURL}
                        occurrences={this.state.occurrences}
                    />
                )}
            </Fragment>
        );
    }
}

export default App;
