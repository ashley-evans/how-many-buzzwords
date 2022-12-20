import React, { ReactNode } from "react";
import { Button } from "antd";
import { useHref, useLinkClickHandler } from "react-router-dom";

type ButtonLinkProps = {
    type?: "link" | "text" | "ghost" | "default" | "primary" | "dashed";
    to: string;
    children?: ReactNode;
};

function ButtonLink(props: ButtonLinkProps) {
    const href = useHref(props.to);
    const handleClick = useLinkClickHandler(props.to);

    return (
        <Button
            type={props.type}
            href={href}
            onClick={(
                event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
            ) => {
                if (!event.defaultPrevented) {
                    handleClick(event);
                }
            }}
        >
            {props.children}
        </Button>
    );
}

export default ButtonLink;
