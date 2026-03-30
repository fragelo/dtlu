import { logsClient } from '@dynatrace-sdk/client-classic-environment-v2';
import { LogRecord, chunkRecords } from './csvParser';

export interface IngestResult {
  success: boolean;
  sentRecords: number;
  failedRecords: number;
  batches: number;
  errors: string[];
}

export interface IngestProgress {
  currentBatch: number;
  totalBatches: number;
  sentSoFar: number;
}

const BATCH_SIZE = 1000;

export async function ingestLogs(
  records: LogRecord[],
  _endpointUrl: string,
  _apiToken: string,
  onProgress?: (progress: IngestProgress) => void
): Promise<IngestResult> {
  const errors: string[] = [];
  let sentRecords = 0;
  let failedRecords = 0;
  const chunks = chunkRecords(records, BATCH_SIZE);

  for (let i = 0; i < chunks.length; i++) {
    const batch = chunks[i];
    onProgress?.({ currentBatch: i + 1, totalBatches: chunks.length, sentSoFar: sentRecords });

    try {
      await logsClient.storeLog({
        body: batch,
        type: 'application/json; charset=utf-8'
      });
      sentRecords += batch.length;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      errors.push(`Batch ${i + 1}: ${msg}`);
      failedRecords += batch.length;
    }
  }

  return { success: failedRecords === 0, sentRecords, failedRecords, batches: chunks.length, errors };
}

export async function validateEndpoint(_endpointUrl: string, _apiToken: string): Promise<string | null> {
  try {
    await logsClient.storeLog({
      body: [{ content: '__csv_uploader_connectivity_test__', severity: 'debug' }],
      type: 'application/json; charset=utf-8'
    });
    return null;
  } catch (err: any) {
    return err?.message ?? String(err);
  }
}
