import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { render } from "@testing-library/react";

function renderWithMockProvider(
    component: React.ReactNode,
    mocks?: MockedResponse<Record<string, unknown>>[]
) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            {component}
        </MockedProvider>
    );
}

export { renderWithMockProvider };
