interface LogRecord {
  content: string;
  timestamp?: string;
  severity?: string;
  [key: string]: string | undefined;
}

interface IngestPayload {
  records: LogRecord[];
  endpointUrl: string;
  apiToken: string;
}

export default async function ({ payload }: { payload: { data: IngestPayload } }) {
  const { records, endpointUrl, apiToken } = payload.data;

  if (!records || !endpointUrl || !apiToken) {
    return { success: false, error: 'Missing required fields' };
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Api-Token ${apiToken}`,
    },
    body: JSON.stringify(records),
  });

  if (response.status === 204) {
    return { success: true, status: 204 };
  }

  const text = await response.text();
  return { success: false, status: response.status, error: text };
}
