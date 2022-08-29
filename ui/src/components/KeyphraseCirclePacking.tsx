import React, { Fragment } from "react";
import { CirclePacking, CirclePackingConfig } from "@ant-design/plots";
import { Empty } from "antd";

import ResultConstants from "../enums/Constants";
import { UniqueOccurrenceKey } from "../types/UniqueOccurrenceKey";

type KeyphraseCirclePackingProps = {
    occurrences: Record<UniqueOccurrenceKey, number>;
    url: URL;
};

type KeyphraseCirclePackingValue = {
    name: string;
    value: number;
};

type KeyphraseCirclePackingChild = Omit<
    KeyphraseCirclePackingValue,
    "value"
> & {
    children: KeyphraseCirclePackingValue[];
};

type KeyphraseCirclePackingTotal = KeyphraseCirclePackingValue & {
    children: KeyphraseCirclePackingChild[];
};

function createKeyphraseTreeData(
    occurrences: Record<UniqueOccurrenceKey, number>
): KeyphraseCirclePackingTotal[] {
    const totals: Record<string, number> = {};
    const groups = Object.entries(occurrences).reduce(
        (
            groups: Record<string, KeyphraseCirclePackingValue[]>,
            [key, occurrences]
        ) => {
            const [pathname, keyphrase] = key.split("#");
            if (!groups[keyphrase]) {
                groups[keyphrase] = [];
            }

            if (pathname == ResultConstants.TOTAL) {
                totals[keyphrase] = occurrences;
            } else {
                groups[keyphrase].push({
                    name: pathname,
                    value: occurrences,
                });
            }

            return groups;
        },
        {}
    );

    return Object.entries(totals).reduce(
        (acc: KeyphraseCirclePackingTotal[], [keyphrase, occurrences]) => {
            if (groups[keyphrase].length != 0) {
                acc.push({
                    name: "",
                    value: occurrences,
                    children: [
                        {
                            name: keyphrase,
                            children: groups[keyphrase],
                        },
                    ],
                });
            }

            return acc;
        },
        []
    );
}

function KeyphraseTreeMap(props: KeyphraseCirclePackingProps) {
    const data = {
        name: props.url.toString(),
        children: createKeyphraseTreeData(props.occurrences),
    };

    const config: CirclePackingConfig = {
        data,
        autoFit: true,
        padding: 0,
        label: {
            formatter: ({ name }) => {
                return name !== props.url.toString() ? name : "";
            },
        },
        drilldown: {
            enabled: true,
            breadCrumb: {
                rootText: props.url.toString(),
                dividerText: "",
                position: "top-left",
                textStyle: {
                    fill: "white",
                },
            },
        },
        colorField: "name",
        theme: "dark",
        renderer: "svg",
    };

    return (
        <Fragment>
            {data.children.length == 0 && (
                <Empty description={<span>Awaiting results...</span>} />
            )}
            {data.children.length != 0 && (
                <figure>
                    <CirclePacking {...config} />
                </figure>
            )}
        </Fragment>
    );
}

export default KeyphraseTreeMap;
