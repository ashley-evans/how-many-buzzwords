import React, { Component } from "react";

type AppState = {
    baseURL: string;
    validationError: string;
};

class App extends Component<unknown, AppState> {
    state: AppState = {
        baseURL: "",
        validationError: "",
    };

    handleURLChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        this.setState({ baseURL: event.target.value, validationError: "" });
    };

    handleCrawlSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
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
                new URL(baseURL);
            } catch {
                this.setState({ validationError: "Please enter a valid URL." });
            }
        }
    };

    render() {
        return (
            <div>
                <h1>How many buzzwords</h1>
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
            </div>
        );
    }
}

export default App;
