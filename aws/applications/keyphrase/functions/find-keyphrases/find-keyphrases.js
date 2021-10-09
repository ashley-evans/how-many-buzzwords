const middy = require('@middy/core');
const sqsJsonBodyHandler = require('@middy/sqs-json-body-parser');
const validator = require('@middy/validator');

const gotScraping = require('got-scraping');
const htmlparser = require('htmlparser2');

const retext = require('retext');
const retextPos = require('retext-pos');
const retextKeywords = require('retext-keywords');
const toString = require('nlcst-to-string');

const escapeRegExp = require('lodash.escaperegexp');

const {
    DynamoDBClient,
    PutItemCommand,
    GetItemCommand
} = require('@aws-sdk/client-dynamodb');
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
                        required: ['baseUrl', 'childUrl'],
                        properties: {
                            baseUrl: {
                                type: 'string',
                                // eslint-disable-next-line max-len
                                pattern: '(http(s)?:\\/\\/.)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
                            },
                            childUrl: {
                                type: 'string',
                                // eslint-disable-next-line max-len
                                pattern: '(http(s)?:\\/\\/.)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
                            }
                        }
                    }
                }
            }
        }
    }
};

const getAllTextInHTML = (htmlBody) => {
    let result = '';
    const parser = new htmlparser.Parser({
        ontext (text) {
            result = `${result} ${text}`;
        }
    });

    parser.write(htmlBody);
    parser.end();
    return result.replace(/\n|\r/g, '').trim();
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

const countKeyPhrases = (text, keyPhrases) => {
    const keyPhraseOccurances = [];
    for (const phrase of keyPhrases) {
        const occuranceExpression = new RegExp(
            `\\b${escapeRegExp(phrase)}\\b`,
            'gi'
        );
        const occurances = (text.match(occuranceExpression) || []).length;
        keyPhraseOccurances.push({
            phrase,
            occurances
        });
    }

    return keyPhraseOccurances;
};

const combinePreviousOccurances = async (baseUrl, keyPhraseOccurances) => {
    for (const phraseOccurance of keyPhraseOccurances) {
        const params = {
            TableName: process.env.TABLE_NAME,
            Key: {
                BaseUrl: { S: baseUrl },
                KeyPhrase: { S: phraseOccurance.phrase }
            },
            ProjectionExpression: 'Occurances'
        };

        const result = await ddbClient.send(new GetItemCommand(params));
        if (result?.Item?.Occurances?.N) {
            phraseOccurance.occurances = phraseOccurance.occurances +
                parseInt(result.Item.Occurances.N);
        }
    }

    return keyPhraseOccurances;
};

const storeKeyPhrases = async (baseUrl, keyPhraseOccurances) => {
    for (const phraseOccurance of keyPhraseOccurances) {
        const params = {
            TableName: process.env.TABLE_NAME,
            Item: {
                BaseUrl: { S: baseUrl },
                KeyPhrase: { S: phraseOccurance.phrase },
                Occurances: { N: phraseOccurance.occurances.toString() }
            }
        };

        await ddbClient.send(new PutItemCommand(params));
    }
};

const baseHandler = async (event) => {
    for (const record of event.Records) {
        const { baseUrl, childUrl } = record.body;
        const { body } = await gotScraping.get(childUrl);

        const text = getAllTextInHTML(body);
        const keyPhrases = await getKeyPhrases(text);
        const keyPhraseOccurances = countKeyPhrases(text, keyPhrases);
        const combinedOccurances = await combinePreviousOccurances(
            baseUrl,
            keyPhraseOccurances
        );

        await storeKeyPhrases(baseUrl, combinedOccurances);
    }
};

const handler = middy(baseHandler)
    .use(sqsJsonBodyHandler())
    .use(validator({ inputSchema: INPUT_SCHEMA }));

module.exports = {
    handler
};
