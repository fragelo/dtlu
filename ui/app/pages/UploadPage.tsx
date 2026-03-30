import React, { useCallback, useRef, useState } from "react";
import { Flex, Divider, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Text, Paragraph } from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { ProgressCircle, ProgressBar } from "@dynatrace/strato-components/content";
import { FormField, Label, TextInput, Checkbox } from "@dynatrace/strato-components-preview/forms";
import { AppConfig } from "../hooks/useAppConfig";
import { parseCSV, parseRawText, LogRecord, ParseResult } from "../utils/csvParser";
import { ingestLogs, IngestProgress, IngestResult } from "../utils/logIngestionService";

interface UploadPageProps { config: AppConfig; onNavigateToConfig: () => void; }
type UploadState = "idle"|"reading"|"parsed"|"ingesting"|"done"|"partial"|"error";

const C = {
  blue: "#4d8af0", green: "#4caf7d", orange: "#e8914a", red: "#e05c5c",
  bgBlue: "rgba(77,138,240,0.12)", bgGreen: "rgba(76,175,125,0.12)",
  bgOrange: "rgba(232,145,74,0.12)", bgRed: "rgba(224,92,92,0.12)",
  bgCode: "rgba(128,128,128,0.15)", divider: "rgba(128,128,128,0.2)",
};

function InlineAlert({ kind, title, children }: { kind:"success"|"error"|"warning"|"info"; title:string; children:React.ReactNode }) {
  const map = { success:{bg:C.bgGreen,border:C.green}, error:{bg:C.bgRed,border:C.red}, warning:{bg:C.bgOrange,border:C.orange}, info:{bg:C.bgBlue,border:C.blue} };
  const s = map[kind];
  return <div style={{padding:"12px 16px",background:s.bg,borderLeft:`4px solid ${s.border}`,borderRadius:4}}><div style={{fontWeight:700,marginBottom:6}}>{title}</div>{children}</div>;
}

function PreviewTable({ headers, rows }: { headers:string[]; rows:LogRecord[] }) {
  const h = headers.slice(0,6);
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{h.map(hh=><th key={hh} style={{textAlign:"left",padding:"6px 12px",borderBottom:`2px solid ${C.divider}`,whiteSpace:"nowrap",opacity:0.7,fontWeight:600}}>{hh}</th>)}</tr></thead>
        <tbody>{rows.map((row,i)=><tr key={i} style={{background:i%2===0?"transparent":C.bgCode}}>{h.map(hh=><td key={hh} style={{padding:"5px 12px",borderBottom:`1px solid ${C.divider}`,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={String(row[hh]??"")}>{String(row[hh]??"")}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// Simple segmented control for Generic / CSV selection
function FileTypeSelector({ value, onChange }: { value: "generic"|"csv"; onChange: (v: "generic"|"csv") => void }) {
  const btn = (v: "generic"|"csv", label: string) => (
    <button
      onClick={() => onChange(v)}
      style={{
        padding: "6px 20px", border: `1px solid ${value===v ? C.blue : C.divider}`,
        borderRadius: v==="generic" ? "6px 0 0 6px" : "0 6px 6px 0",
        cursor: "pointer", fontSize: 13, fontWeight: value===v ? 700 : 400,
        background: value===v ? C.bgBlue : "transparent",
        color: value===v ? C.blue : "inherit",
        transition: "all 0.15s",
      }}
    >{label}</button>
  );
  return (
    <div style={{display:"inline-flex"}}>
      {btn("generic", "📄 Generic")}
      {btn("csv", "📊 CSV")}
    </div>
  );
}

export const UploadPage: React.FC<UploadPageProps> = ({ config, onNavigateToConfig }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string|null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [parseResult, setParseResult] = useState<ParseResult|null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState<IngestProgress|null>(null);
  const [ingestResult, setIngestResult] = useState<IngestResult|null>(null);
  const [parseError, setParseError] = useState<string|null>(null);

  // Row 1 — file type
  const [fileType, setFileType] = useState<"generic"|"csv">("generic");
  const [useTimestamp, setUseTimestamp] = useState(false);
  const [timestampField, setTimestampField] = useState("");

  // Row 2 — extra attributes
  const [useLogType, setUseLogType] = useState(false);
  const [logTypeValue, setLogTypeValue] = useState("logsample");
  const [useCustomAttr, setUseCustomAttr] = useState(false);
  const [customAttrKey, setCustomAttrKey] = useState("");
  const [customAttrValue, setCustomAttrValue] = useState("");

  const isConfigured = Boolean(config.endpointUrl && config.apiToken);
  const isCsv = fileType === "csv";

  const processFile = useCallback((file: File) => {
    setParseError(null); setParseResult(null); setIngestResult(null); setProgress(null);
    setFileName(file.name); setFileSize(file.size); setUploadState("reading");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const result = isCsv
          ? parseCSV(text, useTimestamp ? timestampField.trim() : undefined)
          : parseRawText(text);
        setParseResult(result);
        if (result.rowCount === 0) { setParseError("No valid records found."); setUploadState("error"); }
        else setUploadState("parsed");
      } catch (err) { setParseError(err instanceof Error ? err.message : "Failed to parse file."); setUploadState("error"); }
    };
    reader.onerror = () => { setParseError("Failed to read the file."); setUploadState("error"); };
    reader.readAsText(file, "utf-8");
  }, [isCsv, useTimestamp, timestampField]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) processFile(f);
  }, [processFile]);

  const handleIngest = async () => {
    if (!parseResult) return;
    setUploadState("ingesting"); setProgress(null); setIngestResult(null);
    const records = parseResult.records.map(r => {
      const enriched = { ...r };
      if (useLogType && logTypeValue.trim()) enriched["log.type"] = logTypeValue.trim();
      if (useCustomAttr && customAttrKey.trim() && customAttrValue.trim()) enriched[customAttrKey.trim()] = customAttrValue.trim();
      return enriched;
    });
    const result = await ingestLogs(records, config.endpointUrl, config.apiToken, (p)=>setProgress({...p}));
    setIngestResult(result);
    if (result.success) setUploadState("done");
    else if (result.sentRecords>0&&result.failedRecords>0) setUploadState("partial");
    else setUploadState("error");
  };

  const handleReset = () => { setFileName(null); setFileSize(0); setParseResult(null); setIngestResult(null); setProgress(null); setParseError(null); setUploadState("idle"); };

  const pct = progress&&progress.totalBatches>0 ? Math.round((progress.currentBatch/progress.totalBatches)*100) : 0;
  const fmt = (b:number) => b<1024?`${b} B`:b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(1)} MB`;

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:32}}>
      <Flex flexDirection="column" gap={24}>

        <Flex flexDirection="column" gap={8}>
          <Heading level={2}>Upload Log File</Heading>
          <Paragraph>Upload any log file and ingest it into Dynatrace Grail.</Paragraph>
        </Flex>

        {!isConfigured && (
          <InlineAlert kind="warning" title="Configuration Required">
            <Flex flexDirection="column" gap={8}>
              <Text>No API endpoint or token configured yet.</Text>
              <Button variant="default" onClick={onNavigateToConfig}>Go to Configuration</Button>
            </Flex>
          </InlineAlert>
        )}

        {isConfigured && (
          <div style={{padding:"8px 14px",background:C.bgBlue,borderRadius:4,borderLeft:`4px solid ${C.blue}`}}>
            <Text style={{fontSize:13}}><strong>Endpoint:</strong> {config.endpointUrl}</Text>
          </div>
        )}

        {/* Options panel */}
        <Surface>
          <Flex flexDirection="column" gap={0} style={{padding:"16px 20px"}}>

            {/* Row 1 — file type */}
            <Flex flexDirection="row" alignItems="center" gap={20} style={{paddingBottom:16}}>
              <Text style={{minWidth:80,opacity:0.7,fontSize:13}}>File type</Text>
              <FileTypeSelector value={fileType} onChange={(v) => { setFileType(v); handleReset(); }} />
              {isCsv && (
                <>
                  <div style={{width:1,height:24,background:C.divider}} />
                  <Flex flexDirection="row" alignItems="center" gap={8}>
                    <Checkbox value={useTimestamp} onChange={setUseTimestamp} />
                    <Text style={{fontSize:13}}>Timestamp column</Text>
                  </Flex>
                  {useTimestamp && (
                    <TextInput
                      value={timestampField}
                      onChange={setTimestampField}
                      placeholder="column name or number (e.g. 1)"
                      style={{maxWidth:220,fontSize:13}}
                    />
                  )}
                </>
              )}
              {!isCsv && (
                <Text style={{fontSize:12,opacity:0.5}}>Each line → one log record · timestamp = ingestion time</Text>
              )}
            </Flex>

            <Divider />

            {/* Row 2 — extra attributes */}
            <Flex flexDirection="row" alignItems="center" gap={20} style={{paddingTop:16}} flexWrap="wrap">
              <Text style={{minWidth:80,opacity:0.7,fontSize:13}}>Add fields</Text>

              {/* log.type */}
              <Flex flexDirection="row" alignItems="center" gap={8}>
                <Checkbox value={useLogType} onChange={setUseLogType} />
                <Text style={{fontSize:13}}><code>log.type</code></Text>
              </Flex>
              {useLogType && (
                <TextInput
                  value={logTypeValue}
                  onChange={setLogTypeValue}
                  placeholder="e.g. logsample"
                  style={{maxWidth:180,fontSize:13}}
                />
              )}

              <div style={{width:1,height:24,background:C.divider}} />

              {/* custom attribute */}
              <Flex flexDirection="row" alignItems="center" gap={8}>
                <Checkbox value={useCustomAttr} onChange={setUseCustomAttr} />
                <Text style={{fontSize:13}}>Custom attribute</Text>
              </Flex>
              {useCustomAttr && (
                <Flex flexDirection="row" alignItems="center" gap={8}>
                  <TextInput
                    value={customAttrKey}
                    onChange={setCustomAttrKey}
                    placeholder="attribute name"
                    style={{maxWidth:160,fontSize:13}}
                  />
                  <Text style={{opacity:0.5}}>=</Text>
                  <TextInput
                    value={customAttrValue}
                    onChange={setCustomAttrValue}
                    placeholder="value"
                    style={{maxWidth:160,fontSize:13}}
                  />
                </Flex>
              )}
            </Flex>

          </Flex>
        </Surface>

        {/* Drop zone */}
        {uploadState==="idle" && (
          <div role="button" tabIndex={0}
            onDragOver={(e)=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
            onClick={()=>fileInputRef.current?.click()} onKeyDown={(e)=>e.key==="Enter"&&fileInputRef.current?.click()}
            style={{border:`2px dashed ${dragOver?C.blue:C.divider}`,borderRadius:8,padding:48,textAlign:"center",background:dragOver?C.bgBlue:"transparent",cursor:"pointer",outline:"none",transition:"all 0.2s"}}>
            <Flex flexDirection="column" alignItems="center" gap={16}>
              <div style={{fontSize:48}}>📤</div>
              <Heading level={4}>Drag & drop a file here</Heading>
              <Text style={{opacity:0.6}}>{isCsv?"Accepted: .csv · UTF-8 · comma-separated":"Accepted: any text log file (.log, .txt, .out, …)"}</Text>
              <Button variant="emphasized" onClick={(e)=>{e.stopPropagation();fileInputRef.current?.click();}}>Browse File</Button>
            </Flex>
          </div>
        )}

        <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={(e)=>{const f=e.target.files?.[0];if(f)processFile(f);e.target.value="";}} />

        {uploadState==="reading" && (
          <Flex justifyContent="center" alignItems="center" gap={16} style={{padding:32}}>
            <ProgressCircle /><Text>Reading {fileName}…</Text>
          </Flex>
        )}

        {parseError&&!ingestResult && (
          <InlineAlert kind="error" title="Parse Error">
            <Flex flexDirection="column" gap={8}><Text>{parseError}</Text><Button variant="default" onClick={handleReset}>Try Again</Button></Flex>
          </InlineAlert>
        )}

        {parseResult&&!["idle","reading"].includes(uploadState) && (
          <Flex flexDirection="column" gap={16}>

            <Surface>
              <Flex flexDirection="row" gap={16} alignItems="center" flexWrap="wrap" style={{padding:"10px 16px"}}>
                <Text><strong>{fileName}</strong></Text>
                <Text style={{opacity:0.6}}>{fmt(fileSize)}</Text>
                <Text><strong>{parseResult.rowCount.toLocaleString()}</strong> records</Text>
                {parseResult.skippedRows>0&&<Text style={{color:C.orange}}>{parseResult.skippedRows} rows skipped</Text>}
                {parseResult.headers.length>0&&<Text style={{opacity:0.6}}>{parseResult.headers.length} columns</Text>}
                {useLogType&&logTypeValue&&<Text style={{color:C.blue,fontSize:13}}>+log.type=<strong>{logTypeValue}</strong></Text>}
                {useCustomAttr&&customAttrKey&&customAttrValue&&<Text style={{color:C.blue,fontSize:13}}>+{customAttrKey}=<strong>{customAttrValue}</strong></Text>}
              </Flex>
            </Surface>

            {parseResult.warnings.length>0&&(
              <InlineAlert kind="warning" title="Warnings">
                <Flex flexDirection="column" gap={4}>{parseResult.warnings.map((w,i)=><Text key={i}>• {w}</Text>)}</Flex>
              </InlineAlert>
            )}

            {isCsv&&parseResult.headers.length>0&&(
              <Flex flexDirection="column" gap={6}>
                <Text style={{opacity:0.6,fontSize:13}}>Preview — first 5 rows</Text>
                <PreviewTable headers={parseResult.headers} rows={parseResult.records.slice(0,5)} />
              </Flex>
            )}

            {!isCsv&&parseResult.records.slice(0,3).length>0&&(
              <Flex flexDirection="column" gap={6}>
                <Text style={{opacity:0.6,fontSize:13}}>Preview — first 3 lines</Text>
                {parseResult.records.slice(0,3).map((r,i)=>(
                  <div key={i} style={{fontFamily:"monospace",fontSize:12,padding:"6px 10px",background:C.bgCode,borderRadius:4,wordBreak:"break-all"}}>{r.content}</div>
                ))}
              </Flex>
            )}

            <Divider />

            {uploadState==="parsed"&&(
              <Flex flexDirection="row" gap={12} alignItems="center" flexWrap="wrap">
                <Button variant="emphasized" onClick={handleIngest} disabled={!isConfigured}>
                  Ingest {parseResult.rowCount.toLocaleString()} Records into Dynatrace
                </Button>
                <Button variant="default" onClick={handleReset}>Choose Different File</Button>
              </Flex>
            )}

            {uploadState==="ingesting"&&(
              <Flex flexDirection="column" gap={12}>
                <Text>{progress?`Sending batch ${progress.currentBatch} of ${progress.totalBatches}…`:"Preparing…"}</Text>
                <ProgressBar value={pct} max={100} />
                {progress&&<Text style={{opacity:0.6,fontSize:13}}>{progress.sentSoFar.toLocaleString()} records sent so far</Text>}
              </Flex>
            )}

            {uploadState==="done"&&ingestResult&&(
              <Flex flexDirection="column" gap={12}>
                <InlineAlert kind="success" title="Ingestion Complete">
                  <Text><strong>{ingestResult.sentRecords.toLocaleString()}</strong> records ingested in <strong>{ingestResult.batches}</strong> {ingestResult.batches===1?"batch":"batches"}. Appears in Log Viewer within seconds.</Text>
                </InlineAlert>
                <Button variant="default" onClick={handleReset}>Upload Another File</Button>
              </Flex>
            )}

            {uploadState==="partial"&&ingestResult&&(
              <Flex flexDirection="column" gap={12}>
                <InlineAlert kind="warning" title="Partial Ingest">
                  <Flex flexDirection="column" gap={4}>
                    <Text><strong>{ingestResult.sentRecords.toLocaleString()}</strong> sent, <strong>{ingestResult.failedRecords.toLocaleString()}</strong> failed.</Text>
                    {ingestResult.errors.map((e,i)=><Text key={i}>• {e}</Text>)}
                  </Flex>
                </InlineAlert>
                <Button variant="default" onClick={handleReset}>Start Over</Button>
              </Flex>
            )}

            {uploadState==="error"&&ingestResult&&(
              <InlineAlert kind="error" title="Ingestion Failed">
                <Flex flexDirection="column" gap={4}>
                  <Text>All {ingestResult.failedRecords.toLocaleString()} records failed.</Text>
                  {ingestResult.errors.slice(0,5).map((e,i)=><Text key={i}>• {e}</Text>)}
                </Flex>
              </InlineAlert>
            )}

          </Flex>
        )}

      </Flex>
    </div>
  );
};
