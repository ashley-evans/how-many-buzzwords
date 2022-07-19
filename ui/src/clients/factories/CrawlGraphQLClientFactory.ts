import {
    ApolloClient,
    ApolloLink,
    HttpLink,
    InMemoryCache,
    NormalizedCacheObject,
} from "@apollo/client";
import { Auth } from "@aws-amplify/auth";
import { createAuthLink, AuthOptions } from "aws-appsync-auth-link";
import { createSubscriptionHandshakeLink } from "aws-appsync-subscription-link";

class CrawlGraphQLClientFactory {
    private authConfiguration: AuthOptions = {
        type: "AWS_IAM",
        credentials: () => Auth.currentCredentials(),
    };

    constructor(private url: string, private region: string) {}

    createClient(): ApolloClient<NormalizedCacheObject> {
        const httpLink = new HttpLink({ uri: this.url });
        const link = ApolloLink.from([
            createAuthLink({
                url: this.url,
                region: this.region,
                auth: this.authConfiguration,
            }),
            createSubscriptionHandshakeLink(
                {
                    url: this.url,
                    region: this.region,
                    auth: this.authConfiguration,
                },
                httpLink
            ),
        ]);

        return new ApolloClient({
            link,
            cache: new InMemoryCache(),
        });
    }
}

export default CrawlGraphQLClientFactory;
