import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import SiteLayout from "../SiteLayout";

function renderWithChildRoute(component: React.ReactNode) {
    return render(
        <MemoryRouter>
            <Routes>
                <Route path="/" element={<SiteLayout />}>
                    <Route index element={component} />
                </Route>
            </Routes>
        </MemoryRouter>
    );
}

describe("given used as a layout route", () => {
    test("displays the tile of the site in a header", () => {
        const expectedTitle = "How many buzzwords";

        const { getByRole } = renderWithChildRoute(<p>Test</p>);

        expect(
            getByRole("heading", { name: expectedTitle })
        ).toBeInTheDocument();
    });

    test("displays child route content", () => {
        const expectedContent = "Test";

        const { getByText } = renderWithChildRoute(<p>{expectedContent}</p>);

        expect(getByText(expectedContent)).toBeInTheDocument();
    });
});
