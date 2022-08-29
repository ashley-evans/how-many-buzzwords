import React, { Fragment } from "react";
import { Treemap } from "@ant-design/plots";

import ResultConstants from "../enums/Constants";
import { UniqueOccurrenceKey } from "../types/UniqueOccurrenceKey";

type KeyphraseTreeMapProps = {
    occurrences: Record<UniqueOccurrenceKey, number>;
};

type KeyphraseTreeMapValue = {
    name: string;
    value: number;
};

function KeyphraseTreeMap(props: KeyphraseTreeMapProps) {
    const totalOccurrences: KeyphraseTreeMapValue[] = Object.entries(
        props.occurrences
    ).reduce((acc: KeyphraseTreeMapValue[], [key, value]) => {
        const [pathname, keyphrase] = key.split("#");
        if (pathname == ResultConstants.TOTAL) {
            acc.push({ name: keyphrase, value });
        }

        return acc;
    }, []);

    const data = {
        name: "root",
        children: totalOccurrences,
    };

    return (
        <Fragment>
            {totalOccurrences.length == 0 && <p>Awaiting results...</p>}
            {totalOccurrences.length != 0 && (
                <figure>
                    <Treemap data={data} colorField="name" renderer="svg" />
                </figure>
            )}
        </Fragment>
    );
}

export default KeyphraseTreeMap;
