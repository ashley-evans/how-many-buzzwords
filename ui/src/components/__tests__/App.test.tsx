import React from "react";
import { render } from "@testing-library/react";

import App from "../App";

test("renders a message", () => {
    const expectedMessage = "How many buzzwords";

    const { getByText } = render(<App />);

    expect(getByText(expectedMessage)).toBeInTheDocument();
});
