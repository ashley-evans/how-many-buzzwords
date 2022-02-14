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

describe('stores page content for a given url', () => {
    let response: SinonSpyCall<
        [PutObjectCommand], 
        Promise<PutObjectCommandOutput>
        >[];

    beforeAll(async () => {
        mockS3Client.reset();

        await repository.storePageContent(VALID_URL, VALID_CONTENT);
        response = mockS3Client.commandCalls(PutObjectCommand);
    });

    test('calls the S3 client to store the content', () => {
        expect(response).toHaveLength(1);
    });
});
