const middy = require('@middy/core');
const sqsJsonBodyHandler = require('@middy/sqs-json-body-parser');
const validator = require('@middy/validator');

const { gotScraping } = require('got-scraping');

const retext = require('retext');
const retextPos = require('retext-pos');
const retextKeywords = require('retext-keywords');
const toString = require('nlcst-to-string');

const escapeRegExp = require('lodash.escaperegexp');

const {
    DynamoDBClient,
    PutItemCommand,
    QueryCommand
} = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const { getAllTextInHTML } = require('./parse-html');
const {
    URLsTableKeyFields,
    KeyphraseTableKeyFields,
    KeyphraseTableNonKeyFields
} = require('./enums');

const ddbClient = new DynamoDBClient({});

const INPUT_SCHEMA = {
    type: 'object',
    required: ['Records'],
    properties: {
        Records: {
            type: 'array',
            items: {
                type: 'object',
                required: ['body'],
                properties: {
                    body: {
                        type: 'object',
                        required: [
                            URLsTableKeyFields.HashKey,
                            URLsTableKeyFields.SortKey
                        ],
                        properties: {
                            [URLsTableKeyFields.HashKey]: {
                                type: 'string',
                                // eslint-disable-next-line max-len
                                pattern: '^(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)$'
                            },
                            [URLsTableKeyFields.SortKey]: {
                                type: 'string',
                                pattern: '^/.*$'
                            }
                        }
                    }
                }
            }
        }
    }
};

const createChildURL = (baseUrl, childPathname) => {
    const validBaseUrl = new URL(`http://${baseUrl}`);
    if (validBaseUrl.pathname === '/') {
        const validBaseUrlString = validBaseUrl.toString();

        return `${validBaseUrlString.substring(
            0,
            validBaseUrlString.length - 1
        )}${childPathname}`;
    }

    return `http://${validBaseUrl.hostname}${childPathname}`;
};

const getKeyPhrases = async (text) => {
    const keyPhrases = [];
    await retext()
        .use(retextPos)
        .use(retextKeywords)
        .process(text)
        .then((result) => {
            for (const keyword of result.data.keywords) {
                const phrase = toString(keyword.matches[0].node).toLowerCase();
                keyPhrases.push(phrase);
            }

            for (const keyPhrase of result.data.keyphrases) {
                const phrase = keyPhrase.matches[0].nodes.map(
                    (d) => toString(d).toLowerCase()
                ).join('');
                keyPhrases.push(phrase);
            }
        });

    return keyPhrases;
};

const getPreviousKeyPhrases = async (baseUrl) => {
    const params = {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: '#url = :searchUrl',
        ExpressionAttributeNames: {
            '#url': KeyphraseTableKeyFields.HashKey
        },
        ExpressionAttributeValues: {
            ':searchUrl': { S: baseUrl }
        },
        ProjectionExpression: KeyphraseTableKeyFields.SortKey +
            `,${KeyphraseTableNonKeyFields.Occurence}`
    };

    const result = await ddbClient.send(new QueryCommand(params));
    return result?.Items
        ? result.Items.map(item => unmarshall(item))
        : [];
};

const combineKeyPhrases = (currentPhrases, previousPhrases) => {
    const previousSet = new Set(previousPhrases.map(
        phrase => phrase[KeyphraseTableKeyFields.SortKey])
    );
    const merged = previousPhrases.concat(
        currentPhrases
            .filter((phrase) => !previousSet.has(phrase))
            .map((phrase) => ({
                [KeyphraseTableKeyFields.SortKey]: phrase
            }))
    );

    return merged;
};

const countKeyPhrases = (text, keyPhraseOccurences) => {
    const updatedOccurences = [];
    for (const keyPhraseOccurence of keyPhraseOccurences) {
        const occuranceExpression = new RegExp(
            '\\b' +
            escapeRegExp(
                keyPhraseOccurence[KeyphraseTableKeyFields.SortKey]
            ) +
            '\\b',
            'gi'
        );
        const occurences = (text.match(occuranceExpression) || []).length;

        if (occurences > 0) {
            let previousOccurences = parseInt(
                keyPhraseOccurence[KeyphraseTableNonKeyFields.Occurence]
            );
            previousOccurences = isNaN(previousOccurences)
                ? 0
                : previousOccurences;
            updatedOccurences.push({
                phrase: keyPhraseOccurence.KeyPhrase,
                occurences: previousOccurences + occurences
            });
        }
    }

    return updatedOccurences;
};

const storeKeyPhrases = async (baseUrl, keyPhraseOccurences) => {
    for (const phraseOccurence of keyPhraseOccurences) {
        const params = {
            TableName: process.env.TABLE_NAME,
            Item: {
                [KeyphraseTableKeyFields.HashKey]: { S: baseUrl },
                [KeyphraseTableKeyFields.SortKey]: {
                    S: phraseOccurence.phrase
                },
                [KeyphraseTableNonKeyFields.Occurence]: {
                    N: phraseOccurence.occurences.toString()
                }
            }
        };

        await ddbClient.send(new PutItemCommand(params));
    }
};

const baseHandler = async (event) => {
    for (const record of event.Records) {
        const baseUrl = record.body[URLsTableKeyFields.HashKey];
        const pathname = record.body[URLsTableKeyFields.SortKey];
        const childUrl = createChildURL(baseUrl, pathname);

        const { body } = await gotScraping({
            url: childUrl,
            http2: false
        });

        const text = getAllTextInHTML(body);

        const keyPhrases = await getKeyPhrases(text);
        const previousKeyPhrases = await getPreviousKeyPhrases(
            baseUrl
        );
        const combinedPhrases = combineKeyPhrases(
            keyPhrases,
            previousKeyPhrases
        );

        const finalOccurances = countKeyPhrases(text, combinedPhrases);

        await storeKeyPhrases(baseUrl, finalOccurances);
    }
};

const handler = middy(baseHandler)
    .use(sqsJsonBodyHandler())
    .use(validator({ inputSchema: INPUT_SCHEMA }));

module.exports = {
    handler
};
