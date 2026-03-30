const fetchMock = jest.fn();
globalThis.fetch = fetchMock;

import ingestLogsFunction from './ingest-logs.function';

describe('ingest-logs.function', () => {
  it('should return an object with a message property', async () => {
    // An example of how to overwrite the implementation of fetch within a test.
    fetchMock.mockImplementationOnce(() => {
      throw new Error('fetch should not be called in this function');
    });
    const result = await ingestLogsFunction();
    expect(result).toEqual('Hello world');
    expect(fetchMock).not.toHaveBeenCalled();
    expect.assertions(2);
  });
});
