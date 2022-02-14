import {
    S3Client,
    PutObjectCommandInput,
    PutObjectCommand
} from '@aws-sdk/client-s3';

import ContentRepository from "../ports/ContentRepository";

class S3Repository implements ContentRepository {
    private client: S3Client;

    constructor(private bucketName: string) {
        this.client = new S3Client({});
    }

    async storePageContent(url: URL, content: string): Promise<boolean> {
        const key = url.pathname === '/'
            ? url.hostname
            : `${url.hostname}${url.pathname}`;

        const params: PutObjectCommandInput = {
            Bucket: this.bucketName,
            Key: key,
            Body: content
        };

        await this.client.send(new PutObjectCommand(params));
        return true;
    }
}

export default S3Repository;
