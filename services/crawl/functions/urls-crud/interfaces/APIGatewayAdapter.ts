import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface CRUDGatewayAdapter {
    handleRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
}

export default CRUDGatewayAdapter;
