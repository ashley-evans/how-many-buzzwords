import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface URLsCRUDAdapter {
    handleRequest(event: APIGatewayProxyEvent): APIGatewayProxyResult;
}

export default URLsCRUDAdapter;
