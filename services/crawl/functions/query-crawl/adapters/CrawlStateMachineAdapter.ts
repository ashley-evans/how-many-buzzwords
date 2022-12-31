import {
    DescribeExecutionCommand,
    DescribeExecutionCommandOutput,
    ListExecutionsCommand,
    SFNClient,
} from "@aws-sdk/client-sfn";
import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";

import CrawlRepositoryPort from "../ports/CrawlRepositoryPort";
import Crawl from "../types/Crawl";

type ValidCrawlExecutionInput = {
    url: string;
};

const executionInputSchema: JSONSchemaType<ValidCrawlExecutionInput> = {
    type: "object",
    properties: {
        url: {
            type: "string",
        },
    },
    required: ["url"],
};

class CrawlStateMachineAdapter implements CrawlRepositoryPort {
    private client: SFNClient;
    private validator: AjvValidator<ValidCrawlExecutionInput>;

    constructor(private stateMachineARN: string) {
        this.client = new SFNClient({});
        this.validator = new AjvValidator(executionInputSchema);
    }

    async queryCrawl(limit: number): Promise<Crawl[]> {
        const command = new ListExecutionsCommand({
            stateMachineArn: this.stateMachineARN,
            maxResults: limit,
            statusFilter: "SUCCEEDED",
        });

        const executions = (await this.client.send(command)).executions;
        const crawlDetails = await executions?.reduce(
            async (accumulator, current) => {
                const executionDetails = await this.getExecutionDetail(
                    current.executionArn
                );

                try {
                    (await accumulator).push(
                        this.validateCrawlExecutionDetails(executionDetails)
                    );
                } catch (ex) {
                    console.warn(ex);
                }

                return accumulator;
            },
            Promise.resolve([] as Crawl[])
        );

        return crawlDetails || [];
    }

    private async getExecutionDetail(
        arn?: string
    ): Promise<DescribeExecutionCommandOutput> {
        const command = new DescribeExecutionCommand({
            executionArn: arn,
        });
        return this.client.send(command);
    }

    private validateCrawlExecutionDetails(
        description: DescribeExecutionCommandOutput
    ): Crawl {
        const validatedInput = this.validator.validate(description.input);
        if (!description.startDate) {
            throw new Error("No crawl execution start date provided");
        }

        let url = validatedInput.url;
        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            url = `https://${url}`;
        }

        return {
            baseURL: new URL(url),
            crawledAt: new Date(description.startDate),
        };
    }
}

export { CrawlStateMachineAdapter, ValidCrawlExecutionInput };
