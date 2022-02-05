import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import APIGatewayAdapter from "../../../interfaces/APIGatewayAdapter";

class GetURLsAdapter implements APIGatewayAdapter {
    async handleRequest(
        event: APIGatewayProxyEvent
    ): Promise<APIGatewayProxyResult> {
        throw new Error("Method not implemented." + event);
    }
}

export default GetURLsAdapter;
