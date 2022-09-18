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
            await this.client.send(command);
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
            throw "Not implemented";
        }

        const detail: URLPublishEntryDetail = {
            baseURL: url.hostname,
            pathname: url.pathname,
        };

        const entry: PutEventsRequestEntry = {
            EventBusName: this.eventBusName,
            DetailType: CRAWL_PUBLISH_URL_DETAIL,
            Source: CRAWL_SERVICE_SOURCE,
            Detail: JSON.stringify(detail),
        };

        const command = new PutEventsCommand({ Entries: [entry] });

        try {
            await this.client.send(command);
            console.log(
                `Successfully published newly crawled URL: ${url.toString()}`
            );

            return true;
        } catch (ex) {
            console.error(
                `An error occurred publishing URL: ${url.toString()}. Error: ${ex}`
            );

            return false;
        }
    }
}

export default EventBridgeClient;
