import { ApolloClient } from "@apollo/client";
import CrawlGraphQLClientFactory from "../CrawlGraphQLClientFactory";

jest.mock("@aws-amplify/auth");

const factory = new CrawlGraphQLClientFactory("test", "test");

test("creates an instance of websocket keyphrase service client", () => {
    const client = factory.createClient();

    expect(client).toBeInstanceOf(ApolloClient);
});
