import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

interface APIGatewayAdapter {
    handleRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
}

export default APIGatewayAdapter;
