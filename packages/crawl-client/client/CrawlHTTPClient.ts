import axios, { AxiosInstance } from "axios";
import CrawlClient from "../interface/CrawlClient";

class CrawlHTTPClient implements CrawlClient {
    private client: AxiosInstance;

    constructor(serviceEndpoint: URL) {
        this.client = axios.create({ baseURL: serviceEndpoint.toString() });
    }

    async getContent(url: URL): Promise<string> {
        const encodedURL = encodeURIComponent(url.toString());
        const response = await this.client.get(`/content?url=${encodedURL}`);
        return response.data;
    }
}

export default CrawlHTTPClient;
