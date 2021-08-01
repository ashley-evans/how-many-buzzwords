const wibble = require('../functions/wibble');

test('returns wibble JSON response from handler', async () => {
    const response = await wibble.handler(null, null);

    expect(response).toBeDefined();
    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.body).toBe(JSON.stringify('wibble'));
});
