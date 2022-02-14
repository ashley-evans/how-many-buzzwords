import {
    S3Client,
    GetObjectCommandInput,
    GetObjectCommand,
    PutObjectCommandInput,
    PutObjectCommand
} from '@aws-sdk/client-s3';

import ContentRepository from "../ports/ContentRepository";

class S3Repository implements ContentRepository {
    private client: S3Client;

    constructor(private bucketName: string) {
        this.client = new S3Client({});
    }

    async getPageContent(url: URL): Promise<string> {
        const params: GetObjectCommandInput = {
            Bucket: this.bucketName,
            Key: this.getContentKey(url)
        };

        await this.client.send(new GetObjectCommand(params));
        return '';
    }

    async storePageContent(url: URL, content: string): Promise<boolean> {
        const params: PutObjectCommandInput = {
            Bucket: this.bucketName,
            Key: this.getContentKey(url),
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

    private getContentKey(url: URL): string {
        return url.pathname === '/'
            ? url.hostname
            : `${url.hostname}${url.pathname}`;
    }
}

export default S3Repository;
