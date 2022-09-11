import { CrawlStatus } from "buzzword-aws-crawl-service-urls-repository-library";
import {
    EventBridgeClient as EBClient,
    PutEventsCommand,
    PutEventsRequestEntry,
} from "@aws-sdk/client-eventbridge";

import EventClient from "../ports/EventClient";

const CRAWL_STATUS_UPDATE_DETAIL = "Crawl Status Update";
const CRAWL_SERVICE_SOURCE = "crawl.aws.buzzword";

type StatusUpdateEntryDetail = {
    baseURL: string;
    status: CrawlStatus;
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
}

export default EventBridgeClient;
