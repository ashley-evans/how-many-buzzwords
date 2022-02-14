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

        try {
            await this.client.send(new PutObjectCommand(params));
            return true;
        } catch (ex) {
            const errorContent = ex instanceof Error 
                ? ex.message 
                : JSON.stringify(ex);

            console.error(
                `Error occurred during page content storage: ${errorContent}`
            );
            return false;
        }

    }
}

export default S3Repository;
