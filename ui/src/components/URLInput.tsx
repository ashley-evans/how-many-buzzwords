import React, { Component, Fragment } from "react";

type URLInputProps = {
    onURLSubmit: (url: URL) => unknown;
};

type URLInputState = {
    url: string;
    validationError: string;
};

class URLInput extends Component<URLInputProps, URLInputState> {
    state: URLInputState = {
        url: "",
        validationError: "",
    };

    handleURLChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        this.setState({ url: event.target.value, validationError: "" });
    };

    handleURLSubmit: React.FormEventHandler<HTMLFormElement> = async (
        event
    ) => {
        event.preventDefault();
        let url = this.state.url;
        if (url == "") {
            this.setState({ validationError: "Please enter a URL." });
        } else if (!isNaN(parseInt(url))) {
            this.setState({ validationError: "Please enter a valid URL." });
        } else {
            if (!url.startsWith("https://") && !url.startsWith("http://")) {
                url = `https://${url}`;
            }

            try {
                const validURL = new URL(url);
                this.props.onURLSubmit(validURL);
            } catch {
                this.setState({ validationError: "Please enter a valid URL." });
            }
        }
    };

    render(): React.ReactNode {
        return (
            <Fragment>
                <form onSubmit={this.handleURLSubmit}>
                    <label>
                        URL:
                        <input
                            type="text"
                            value={this.state.url}
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
}

export { URLInput };
export type { URLInputProps };
