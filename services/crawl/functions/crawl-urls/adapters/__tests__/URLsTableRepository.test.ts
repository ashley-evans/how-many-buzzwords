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

import { Pathname } from '../../ports/Repository';
import URLsTableRepository from '../URLsTableRepository';

const VALID_HOSTNAME = 'www.example.com';
const OTHER_HOSTNAME = 'www.test.com';
const VALID_PATHNAME = '/example';
const OTHER_PATHNAME = '/test';
const TABLE_NAME = 'urls-table';

const repository = new URLsTableRepository(TABLE_NAME, true);

beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

test.each([
    [
        'one stored',
        [
            VALID_PATHNAME
        ]
    ],
    [
        'multiple stored',
        [
            VALID_PATHNAME,
            `${VALID_PATHNAME}1`
        ]
    ]
])(
    'returns pathnames given %s',
    async (message: string, pathnames: string[]) => {
        for (const pathname of pathnames) {
            await repository.storePathname(
                VALID_HOSTNAME,
                pathname
            );
        }

        const response = await repository.getPathnames(VALID_HOSTNAME);
        await repository.deletePathnames(VALID_HOSTNAME);

        expect(response).toBeDefined();
        expect(response).toHaveLength(pathnames.length);
        for (const pathname of pathnames) {
            expect(response).toContainEqual(
                expect.objectContaining({
                    pathname
                })
            );
        }
    }
);

test('only returns pathnames attributed to given base URL', async () => {
    await repository.storePathname(VALID_HOSTNAME, VALID_PATHNAME);
    await repository.storePathname(OTHER_HOSTNAME, OTHER_PATHNAME);

    const response = await repository.getPathnames(VALID_HOSTNAME);
    await repository.deletePathnames(VALID_HOSTNAME);
    await repository.deletePathnames(OTHER_HOSTNAME);

    expect(response).toBeDefined();
    expect(response).toHaveLength(1);
    expect(response[0].pathname).toEqual(VALID_PATHNAME);
});

describe('stores new pathname', () => {
    let response: boolean;
    let stored: Pathname[];

    beforeAll(async () => {
        response = await repository.storePathname(
            VALID_HOSTNAME,
            VALID_PATHNAME
        );

        stored = await repository.getPathnames(VALID_HOSTNAME);
    });

    test('stores the provided pathname into table', () => {
        expect(stored).toBeDefined();
        expect(stored).toHaveLength(1);
        expect(stored[0].pathname).toEqual(VALID_PATHNAME);
    });

    test('stores the time created', () => {
        expect(stored).toBeDefined();
        expect(stored).toHaveLength(1);
        expect(stored[0].createdAt).toEqual(expect.any(Date));
    });

    test('stores the time updated (equal to created)', () => {
        expect(stored).toBeDefined();
        expect(stored).toHaveLength(1);
        expect(stored[0].updatedAt).toEqual(expect.any(Date));
        expect(stored[0].createdAt).toEqual(stored[0].updatedAt);
    });

    test('returns success', () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deletePathnames(VALID_HOSTNAME);
    });
});

describe('updates existing pathname', () => {
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

    test('returns a single pathname', async () => {
        const result = await repository.getPathnames(VALID_HOSTNAME);

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result[0].pathname).toEqual(VALID_PATHNAME);
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
        expect(result[0].pathname).toEqual(OTHER_PATHNAME);
    });

    test('returns success', () => {
        expect(response).toEqual(true);
    });

    afterAll(async () => {
        await repository.deletePathnames(OTHER_HOSTNAME);
    });
});

test('returns failure if no pathnames exist upon deletion', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await repository.deletePathnames('invalid');

    expect(response).toEqual(false);
});

test('given no pathnames then empty array returned upon GET', async () => {
    const response = await repository.getPathnames('invalid');

    expect(response).toBeDefined();
    expect(response).toHaveLength(0);
});
