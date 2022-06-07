import React, { Component, Fragment } from "react";
import axios from "axios";

type AppProps = {
    crawlServiceEndpoint: URL;
};

type AppState = {
    baseURL: string;
    validationError: string;
    crawling: boolean;
};

class App extends Component<AppProps, AppState> {
    state: AppState = {
        baseURL: "",
        validationError: "",
        crawling: false,
    };

    handleURLChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        this.setState({ baseURL: event.target.value, validationError: "" });
    };

    handleCrawlSubmit: React.FormEventHandler<HTMLFormElement> = async (
        event
    ) => {
        event.preventDefault();
        let baseURL = this.state.baseURL;
        if (baseURL == "") {
            this.setState({ validationError: "Please enter a URL." });
        } else if (!isNaN(parseInt(baseURL))) {
            this.setState({ validationError: "Please enter a valid URL." });
        } else {
            if (
                !baseURL.startsWith("https://") &&
                !baseURL.startsWith("http://")
            ) {
                baseURL = `https://${baseURL}`;
            }

            try {
                const validatedURL = new URL(baseURL);
                this.setState({ crawling: true });
                await axios.post(
                    "/crawl",
                    {
                        MessageBody: { url: validatedURL.toString() },
                    },
                    {
                        baseURL: this.props.crawlServiceEndpoint.toString(),
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
                this.setState({ crawling: false });
            } catch {
                this.setState({ validationError: "Please enter a valid URL." });
            }
        }
    };

    renderForm() {
        return (
            <Fragment>
                <form onSubmit={this.handleCrawlSubmit}>
                    <label>
                        URL:
                        <input
                            type="text"
                            value={this.state.baseURL}
                            onChange={this.handleURLChange}
                        />
                    </label>
                    <input type="submit" value="Search!" />
                </form>
                {this.state.validationError && (
                    <div role="alert">{this.state.validationError}</div>
                )}
            </Fragment>
        );
    }

    render() {
        return (
            <Fragment>
                <h1>How many buzzwords</h1>
                {!this.state.crawling && this.renderForm()}
                {this.state.crawling && <p>Crawling...</p>}
            </Fragment>
        );
    }
}

export default App;
