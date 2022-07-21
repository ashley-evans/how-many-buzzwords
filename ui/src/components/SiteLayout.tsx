import React from "react";
import { Outlet } from "react-router-dom";
import { Layout } from "antd";

import "../css/SiteLayout.css";

function SiteLayout() {
    return (
        <Layout>
            <Layout.Header>
                <h1>How many buzzwords</h1>
            </Layout.Header>
            <Layout.Content>
                <div className="site-layout-content">
                    <Outlet />
                </div>
            </Layout.Content>
        </Layout>
    );
}

export default SiteLayout;
