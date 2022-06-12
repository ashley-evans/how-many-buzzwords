import axios, { AxiosInstance } from "axios";
import CrawlServiceClient from "./interfaces/CrawlServiceClient";

class CrawlServiceAxiosClient implements CrawlServiceClient {
    private client: AxiosInstance;

    constructor(crawlServiceEndpoint: URL) {
        this.client = axios.create({
            baseURL: crawlServiceEndpoint.toString(),
        });
    }

    async crawl(baseURL: URL): Promise<boolean> {
        const data = {
            MessageBody: {
                url: baseURL.toString(),
            },
        };
        const headers = {
            "Content-Type": "application/json",
        };
        await this.client.post("/crawl", data, { headers });

        return true;
    }
}

export default CrawlServiceAxiosClient;
