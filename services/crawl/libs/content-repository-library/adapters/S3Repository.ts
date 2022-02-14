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
        const params: PutObjectCommandInput = {
            Bucket: this.bucketName,
            Key: `${url.hostname}${url.pathname}`,
            Body: content
        };

        await this.client.send(new PutObjectCommand(params));
        return true;
    }
}

export default S3Repository;
