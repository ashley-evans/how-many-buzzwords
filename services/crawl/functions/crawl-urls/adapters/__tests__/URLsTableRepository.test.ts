/**
 * @group integration
 */

import dynamoose from 'dynamoose';
import { URLsTableKeyFields } from 'buzzword-aws-crawl-common';

import URLsTableRepository from '../URLsTableRepository';
import URLsTableSchema from '../../schemas/URLsTableSchema';
import URLsTableDocument from '../../schemas/URLsTableDocument';

const VALID_HOSTNAME = 'www.example.com';
const VALID_PATHNAME = '/example';
const TABLE_NAME = 'test';

dynamoose.aws.sdk.config.update({
    region: 'eu-west-2',
    credentials: {
        accessKeyId: 'x',
        secretAccessKey: 'x'
    }
});
dynamoose.aws.ddb.local();

const repository = new URLsTableRepository(TABLE_NAME);
const tableModel = dynamoose.model<URLsTableDocument>(
    TABLE_NAME,
    URLsTableSchema
);

async function resetDatabase() {
    const response = await tableModel
        .scan()
        .exec();

    const items = response.map((item) => ({
        [URLsTableKeyFields.HashKey]: item.BaseUrl,
        [URLsTableKeyFields.SortKey]: item.Pathname
    }));
    if (items.length > 0) {
        await tableModel.batchDelete(items);
    }
}

beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await resetDatabase();
});

describe('happy path', () => {
    let response: boolean;

    beforeAll(async () => {
        response = await repository.storePathname(
            VALID_HOSTNAME,
            VALID_PATHNAME
        );
    });

    test('stores an item with data provided into table', async () => {
        const result = await tableModel
            .query(URLsTableKeyFields.HashKey)
            .eq(VALID_HOSTNAME)
            .exec();

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result[0].BaseUrl).toEqual(VALID_HOSTNAME);
        expect(result[0].Pathname).toEqual(VALID_PATHNAME);
    });

    test('returns success', () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await resetDatabase();
    });
});

describe('overwrites existing items', () => {
    let response: boolean;

    beforeAll(async () => {
        await repository.storePathname(
            VALID_HOSTNAME,
            VALID_PATHNAME
        );
        response = await repository.storePathname(
            VALID_HOSTNAME,
            VALID_PATHNAME
        );
    });

    test('overwrites existing item if item already exists', async () => {
        const result = await tableModel
            .query(URLsTableKeyFields.HashKey)
            .eq(VALID_HOSTNAME)
            .exec();

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result[0].BaseUrl).toEqual(VALID_HOSTNAME);
        expect(result[0].Pathname).toEqual(VALID_PATHNAME);
    });

    test('returns success', () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await resetDatabase();
    });
});
