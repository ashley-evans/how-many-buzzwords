import { gql } from "@apollo/client";

const START_CRAWL_MUTATION = gql`
    mutation StartCrawl($input: StartCrawlInput!) {
        startCrawl(input: $input) {
            started
        }
    }
`;

export default START_CRAWL_MUTATION;
