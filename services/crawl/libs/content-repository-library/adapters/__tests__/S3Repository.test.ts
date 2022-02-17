import { mock } from 'jest-mock-extended';
import { mockClient } from 'aws-sdk-client-mock';
import {
    GetObjectCommand,
    GetObjectCommandOutput,
    PutObjectCommand,
    PutObjectCommandOutput,
    S3Client
} from '@aws-sdk/client-s3';
import { SinonSpyCall } from 'sinon';
import { Readable } from 'stream';

import S3Repository from '../S3Repository';

const mockS3Client = mockClient(S3Client);

const BUCKET_NAME = 'test';
const VALID_URL = new URL('http://www.example.com');
const VALID_CONTENT = 'test content';

const repository = new S3Repository(BUCKET_NAME);

describe.each([
    [
        'no pathname',
        VALID_URL,
        'www.example.com'
    ],
    [
        'a pathname',
        new URL('http://www.example.com/test'),
        'www.example.com/test'
    ],
    [
        'a pathname with query string parameters',
        new URL('http://www.example.com/test?param=true'),
        'www.example.com/test'
    ],
    [
        'a pathname with a forward slash on the end',
        new URL('http://www.example.com/test/'),
        'www.example.com/test'
    ]
])(
    'gets page content for a given url with %s',
    (message: string, url: URL, expectedKey: string) => {
        let response: string;
        let clientCalls: SinonSpyCall<
            [GetObjectCommand], 
            Promise<GetObjectCommandOutput>
            >[];

        beforeAll(async () => {
            mockS3Client.reset();
            const mockResponse = mock<GetObjectCommandOutput>();
            mockResponse.Body = Readable.from([VALID_CONTENT]);
            mockS3Client.on(GetObjectCommand).resolves(mockResponse);

            response = await repository.getPageContent(url);
            clientCalls = mockS3Client.commandCalls(GetObjectCommand);
        });

        test('calls the S3 client to get the content', () => {
            expect(clientCalls).toHaveLength(1);
            expect(clientCalls[0].args).toHaveLength(1);
        });

        test('gets the content from the provided bucket', () => {
            const input = clientCalls[0].args[0].input;
            expect(input).toEqual(
                expect.objectContaining({
                    Bucket: BUCKET_NAME
                })
            );
        });

        test('gets the content from the appropriate key', () => {
            const input = clientCalls[0].args[0].input;
            expect(input).toEqual(
                expect.objectContaining({
                    Key: expectedKey
                })
            );
        });

        test('returns the page content', () => {
            expect(response).toEqual(VALID_CONTENT);
        });
    }
);

test('throws error if content retrieval throws an error', async () => {
    mockS3Client.reset();

    const expectedError = new Error('test');
    mockS3Client.on(GetObjectCommand).rejects(expectedError);

    expect.assertions(1);
    await expect(
        repository.getPageContent(VALID_URL)
    ).rejects.toThrow(expectedError);
});

describe.each([
    [
        'no pathname',
        VALID_URL,
        'www.example.com'
    ],
    [
        'a pathname',
        new URL('http://www.example.com/test'),
        'www.example.com/test'
    ],
    [
        'a pathname with query string parameters',
        new URL('http://www.example.com/test?param=true'),
        'www.example.com/test'
    ],
    [
        'a pathname with a forward slash on the end',
        new URL('http://www.example.com/test/'),
        'www.example.com/test'
    ]
])(
    'stores page content for a given url with %s',
    (message: string, url: URL, expectedKey: string) => {
        let response: boolean;
        let clientCalls: SinonSpyCall<
            [PutObjectCommand], 
            Promise<PutObjectCommandOutput>
            >[];

        beforeAll(async () => {
            mockS3Client.reset();

            response = await repository.storePageContent(
                url,
                VALID_CONTENT
            );
            clientCalls = mockS3Client.commandCalls(PutObjectCommand);
        });

        test('calls the S3 client to store the content', () => {
            expect(clientCalls).toHaveLength(1);
            expect(clientCalls[0].args).toHaveLength(1);
        });

        test('stores the content in the provided bucket', () => {
            const input = clientCalls[0].args[0].input;
            expect(input).toEqual(
                expect.objectContaining({
                    Bucket: BUCKET_NAME
                })
            );
        });

        test('stores the content in the appropriate key', () => {
            const input = clientCalls[0].args[0].input;
            expect(input).toEqual(
                expect.objectContaining({
                    Key: expectedKey
                })
            );
        });

        test('stores the content', () => {
            const input = clientCalls[0].args[0].input;
            expect(input).toEqual(
                expect.objectContaining({
                    Body: VALID_CONTENT
                })
            );
        });

        test('returns true', () => {
            expect(response).toBe(true);
        });
    }
);

test('returns false if S3 client throws error on storage', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    mockS3Client.reset();
    mockS3Client.on(PutObjectCommand).rejects();

    const response = await repository.storePageContent(
        VALID_URL,
        VALID_CONTENT
    );

    expect(response).toBe(false);
});
