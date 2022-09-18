import { CrawlStatus } from "buzzword-crawl-urls-repository-library";
import {
    EventBridgeClient as EBClient,
    PutEventsCommand,
    PutEventsRequestEntry,
} from "@aws-sdk/client-eventbridge";

import EventClient from "../interfaces/EventClient";

const CRAWL_STATUS_UPDATE_DETAIL = "Crawl Status Update";
const CRAWL_PUBLISH_URL_DETAIL = "New URL Crawled via Crawl Service";
const CRAWL_SERVICE_SOURCE = "crawl.aws.buzzword";

type StatusUpdateEntryDetail = {
    baseURL: string;
    status: CrawlStatus;
};

type URLPublishEntryDetail = {
    baseURL: string;
    pathname: string;
};

class EventBridgeClient implements EventClient {
    private static BATCH_SIZE = 10;
    private client: EBClient;

    constructor(private eventBusName: string) {
        this.client = new EBClient({});
    }

    async sentStatusUpdate(url: string, status: CrawlStatus): Promise<boolean> {
        const detail: StatusUpdateEntryDetail = {
            baseURL: url,
            status,
        };

        const entry: PutEventsRequestEntry = {
            EventBusName: this.eventBusName,
            DetailType: CRAWL_STATUS_UPDATE_DETAIL,
            Source: CRAWL_SERVICE_SOURCE,
            Detail: JSON.stringify(detail),
        };

        const command = new PutEventsCommand({ Entries: [entry] });

        try {
            const response = await this.client.send(command);
            if (
                response.FailedEntryCount &&
                response.Entries &&
                response.FailedEntryCount > 0
            ) {
                console.error(
                    `An error occurred sending status update for URL: ${url}. Error: ${response.Entries[0].ErrorCode}`
                );

                return false;
            }

            console.log(
                `Successfully sent status update: ${status} for URL: ${url}`
            );

            return true;
        } catch (ex) {
            console.error(
                `An error occurred sending status update for URL: ${url}. Error: ${ex}`
            );

            return false;
        }
    }

    publishURL(url: URL): Promise<boolean>;
    publishURL(url: URL[]): Promise<URL[]>;
    async publishURL(url: URL | URL[]): Promise<boolean | URL[]> {
        if (Array.isArray(url)) {
            const batches = this.createBatches(url);
            const promises = batches.map((batch) =>
                this.publishURLBatch(batch)
            );

            return (await Promise.all(promises)).flat();
        }

        const failedURLs = await this.publishURLBatch([url]);
        return failedURLs.length == 0;
    }

    private async publishURLBatch(batch: URL[]): Promise<URL[]> {
        const entries = batch.map((url) => this.createPublishURLEntry(url));
        const command = new PutEventsCommand({ Entries: entries });
        try {
            const result = await this.client.send(command);
            if (
                result.FailedEntryCount &&
                result.Entries &&
                result.FailedEntryCount > 0
            ) {
                const failedURLs: URL[] = [];
                result.Entries.forEach((entry, index) => {
                    if (entry.ErrorCode) {
                        const failedURL = batch[index];
                        console.error(
                            `An error occurred when publishing URL: ${failedURL}: Error: ${entry.ErrorCode}`
                        );

                        failedURLs.push(failedURL);
                    }
                });

                return failedURLs;
            }

            console.log(`Successfully published URLs: ${batch.toString()}`);
            return [];
        } catch (ex) {
            console.error(
                `An error occurred publishing URL: ${batch.toString()}. Error: ${ex}`
            );

            return batch;
        }
    }

    private createPublishURLEntry(url: URL): PutEventsRequestEntry {
        const detail: URLPublishEntryDetail = {
            baseURL: url.hostname,
            pathname: url.pathname,
        };

        return {
            EventBusName: this.eventBusName,
            DetailType: CRAWL_PUBLISH_URL_DETAIL,
            Source: CRAWL_SERVICE_SOURCE,
            Detail: JSON.stringify(detail),
        };
    }

    private createBatches<Type>(inputArray: Type[]): Type[][] {
        return inputArray.reduce((result: Type[][], item, index) => {
            const batchIndex = Math.floor(index / EventBridgeClient.BATCH_SIZE);
            if (!result[batchIndex]) {
                result[batchIndex] = [];
            }

            result[batchIndex].push(item);
            return result;
        }, []);
    }
}

export default EventBridgeClient;
