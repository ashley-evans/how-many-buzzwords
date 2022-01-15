import { gotScraping } from "got-scraping";
import HTTPRequestProvider from "./interfaces/HTTPRequestProvider";

class GotProvider implements HTTPRequestProvider {
    async getBody(url: URL): Promise<string> {
        const response = await gotScraping({
            url: url.toString(),
            http2: false
        });

        return response.body;
    }
}

export default GotProvider;
