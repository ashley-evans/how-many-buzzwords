import React from "react";
import { Outlet } from "react-router-dom";
import { Layout, Button } from "antd";
import { GithubOutlined } from "@ant-design/icons";

import "../css/SiteLayout.css";

function SiteLayout() {
    return (
        <Layout style={{ height: "100vh", overflow: "auto" }}>
            <Layout.Header className="site-layout-header">
                <h1>How many buzzwords</h1>
                <Button
                    type="text"
                    href="https://github.com/ashley-evans/how-many-buzzwords"
                    icon={<GithubOutlined style={{ fontSize: "24px" }} />}
                />
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
