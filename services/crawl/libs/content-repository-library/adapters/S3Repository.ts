import {
    S3Client,
    GetObjectCommandInput,
    GetObjectCommand,
    PutObjectCommandInput,
    PutObjectCommand
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

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

        const response = await this.client.send(new GetObjectCommand(params));
        return this.convertStreamToString(response.Body as Readable);
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
        if (url.pathname === '/') {
            return url.hostname;
        } else if (url.pathname.endsWith('/')) {
            return `${url.hostname}${url.pathname.slice(0, -1)}`;
        }

        return `${url.hostname}${url.pathname}`;
    }

    private async convertStreamToString(
        stream?: Readable
    ): Promise<string> {
        if (!stream) {
            throw 'No content returned from S3';
        }

        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];

            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('error', reject);
            stream.on('end', () => {
                resolve(Buffer.concat(chunks).toString("utf-8"));
            });
        });
    }
}

export default S3Repository;
