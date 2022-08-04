import {
    S3Client,
    GetObjectCommandInput,
    GetObjectCommand,
    PutObjectCommandInput,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

import TextRepository from "../ports/TextRepository";

class TextS3Repository implements TextRepository {
    private client: S3Client;

    constructor(private bucketName: string) {
        this.client = new S3Client({});
    }

    async getPageText(url: URL): Promise<string> {
        const params: GetObjectCommandInput = {
            Bucket: this.bucketName,
            Key: this.getContentKey(url),
        };

        const response = await this.client.send(new GetObjectCommand(params));
        return this.convertStreamToString(response.Body as Readable);
    }

    async storePageText(url: URL, text: string): Promise<boolean> {
        const params: PutObjectCommandInput = {
            Bucket: this.bucketName,
            Key: this.getContentKey(url),
            Body: text,
        };

        try {
            await this.client.send(new PutObjectCommand(params));
            return true;
        } catch (ex) {
            const errorContent =
                ex instanceof Error ? ex.message : JSON.stringify(ex);

            console.error(
                `Error occurred during page text storage: ${errorContent}`
            );
            return false;
        }
    }

    private getContentKey(url: URL): string {
        let storagePath: string;
        if (url.pathname === "/") {
            storagePath = url.hostname;
        } else if (url.pathname.endsWith("/")) {
            storagePath = `${url.hostname}${url.pathname.slice(0, -1)}`;
        } else {
            storagePath = `${url.hostname}${url.pathname}`;
        }

        return `${storagePath}.txt`;
    }

    private async convertStreamToString(stream?: Readable): Promise<string> {
        if (!stream) {
            throw "No data returned from S3";
        }

        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];

            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on("error", reject);
            stream.on("end", () => {
                resolve(Buffer.concat(chunks).toString("utf-8"));
            });
        });
    }
}

export default TextS3Repository;
