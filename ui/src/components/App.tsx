import React, { Component } from "react";

type AppState = {
    baseURL: string;
};

class App extends Component<unknown, AppState> {
    state: AppState = {
        baseURL: "",
    };

    handleURLChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        this.setState({ baseURL: event.target.value });
    };

    handleCrawlSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        alert("A URL was submitted: " + this.state.baseURL);
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
            </div>
        );
    }
}

export default App;
