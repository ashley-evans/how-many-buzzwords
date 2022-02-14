import { mockClient } from 'aws-sdk-client-mock';
import {
    PutObjectCommand,
    PutObjectCommandOutput,
    S3Client
} from '@aws-sdk/client-s3';
import { SinonSpyCall } from 'sinon';

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

        test('stores the content in the urls directory', () => {
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
