/**
 * @group integration
 */

import dynamoose from 'dynamoose';

dynamoose.aws.sdk.config.update({
    region: 'eu-west-2',
    credentials: {
        accessKeyId: 'x',
        secretAccessKey: 'x'
    }
});
dynamoose.aws.ddb.local();

import URLsTableRepository from '../URLsTableRepository';

const VALID_HOSTNAME = 'www.example.com';
const VALID_PATHNAME = '/example';
const TABLE_NAME = 'urls-table';

const repository = new URLsTableRepository(TABLE_NAME, true);

beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('happy path', () => {
    let response: boolean;

    beforeAll(async () => {
        response = await repository.storePathname(
            VALID_HOSTNAME,
            VALID_PATHNAME
        );
    });

    test('stores the provided pathname into table', async () => {
        const result = await repository.getPathnames(VALID_HOSTNAME);

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(VALID_PATHNAME);
    });

    test('returns success', () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deletePathnames(VALID_HOSTNAME);
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
        const result = await repository.getPathnames(VALID_HOSTNAME);

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(VALID_PATHNAME);
    });

    test('returns success', () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deletePathnames(VALID_HOSTNAME);
    });
});

describe.each([
    [
        'a single pathname stored',
        [
            VALID_PATHNAME
        ]
    ],
    [
        'multiple pathnames stored',
        [
            VALID_PATHNAME,
            `${VALID_PATHNAME}1`
        ]
    ]
])('deletes given %s', (message: string, pathnames: string[]) => {
    let response: boolean;

    beforeAll(async () => {
        for (const pathname of pathnames) {
            await repository.storePathname(
                VALID_HOSTNAME,
                pathname
            );
        }

        response = await repository.deletePathnames(VALID_HOSTNAME);
    });

    test('returns no pathnames', async () => {
        const result = await repository.getPathnames(VALID_HOSTNAME);

        expect(result).toBeDefined();
        expect(result).toHaveLength(0);
    });

    test('returns success', () => {
        expect(response).toEqual(true);
    });
});

describe('only deletes pathnames attributed to given base URL', () => {
    const OTHER_HOSTNAME = 'www.test.com';
    const OTHER_PATHNAME = '/test';

    let response: boolean;

    beforeAll(async () => {
        await repository.storePathname(VALID_HOSTNAME, VALID_PATHNAME);
        await repository.storePathname(OTHER_HOSTNAME, OTHER_PATHNAME);

        response = await repository.deletePathnames(VALID_HOSTNAME);
    });

    test('returns no pathnames for deleted base URL', async () => {
        const result = await repository.getPathnames(VALID_HOSTNAME);

        expect(result).toBeDefined();
        expect(result).toHaveLength(0);
    });

    test('returns existing pathnames for other base URL', async () => {
        const result = await repository.getPathnames(OTHER_HOSTNAME);

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(OTHER_PATHNAME);
    });

    test('returns success', () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deletePathnames(OTHER_HOSTNAME);
    });
});
