import { mock } from 'jest-mock-extended';
import { APIGatewayProxyEvent } from "aws-lambda";

jest.mock('buzzword-aws-crawl-urls-repository-library');

import { handler } from '../get-urls';

const mockEvent = mock<APIGatewayProxyEvent>();

test('throws error if table name is undefined', async () => {
    delete process.env.TABLE_NAME;

    await expect(handler(mockEvent)).rejects.toThrow(
        new Error('URLs Table Name has not been set.')
    );
});
