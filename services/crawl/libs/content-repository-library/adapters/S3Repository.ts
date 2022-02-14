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
        return this.convertStreamToString(response.Body);
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

    private async convertStreamToString(
        stream?: Readable | ReadableStream<unknown> | Blob
    ): Promise<string> {
        if (!stream) {
            throw 'No content returned from S3';
        }

        if (stream instanceof Readable) {
            return this.convertReadableToString(stream);
        } else if (stream instanceof Blob) {
            return stream.text();
        }

        return this.convertReadableStreamToString(stream);
    }

    private convertReadableToString(stream: Readable): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];

            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('error', reject);
            stream.on('end', () => {
                resolve(Buffer.concat(chunks).toString());
            });
        });
    }

    private convertReadableStreamToString(
        stream: ReadableStream
    ): Promise<string> {
        return new Promise((resolve) => {
            const reader = stream.getReader();
            let result = "";

            reader.read().then(
                function processText({ done, value }): Promise<never> {
                    if (done) {
                        resolve(result);
                    }

                    result += value;
                    return reader.read().then(processText);
                }
            );
        });
    }
}

export default S3Repository;
