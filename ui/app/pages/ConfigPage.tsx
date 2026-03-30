import React, { useEffect, useState } from "react";
import { Flex, Divider, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Text, Paragraph, Link } from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { FormField, Label, TextInput } from "@dynatrace/strato-components-preview/forms";
import { ProgressCircle } from "@dynatrace/strato-components/content";
import { AppConfig } from "../hooks/useAppConfig";
import { validateEndpoint } from "../utils/logIngestionService";

interface ConfigPageProps { config: AppConfig; onSave: (config: AppConfig) => void; }

const C = {
  blue: "#4d8af0", green: "#4caf7d", orange: "#e8914a", red: "#e05c5c",
  bgBlue: "rgba(77,138,240,0.12)", bgGreen: "rgba(76,175,125,0.12)",
  bgOrange: "rgba(232,145,74,0.12)", bgRed: "rgba(224,92,92,0.12)",
};

function InlineAlert({ kind, title, children }: { kind:"success"|"error"|"warning"|"info"; title:string; children:React.ReactNode }) {
  const map = { success:{bg:C.bgGreen,border:C.green}, error:{bg:C.bgRed,border:C.red}, warning:{bg:C.bgOrange,border:C.orange}, info:{bg:C.bgBlue,border:C.blue} };
  const s = map[kind];
  return <div style={{padding:"12px 16px",background:s.bg,borderLeft:`4px solid ${s.border}`,borderRadius:4}}><div style={{fontWeight:700,marginBottom:4}}>{title}</div>{children}</div>;
}

function maskToken(t: string) { return t.length<8?"••••••••":t.slice(0,6)+"••••••••"+t.slice(-4); }
function validateUrl(url: string) { if(!url) return "Required."; if(!url.startsWith("https://")) return "Must start with https://"; if(!url.includes("/api/v2/logs/ingest")) return 'Must contain "/api/v2/logs/ingest"'; return null; }
function validateToken(t: string) { if(!t) return "Required."; if(t.length<10) return "Token too short."; return null; }

export const ConfigPage: React.FC<ConfigPageProps> = ({ config, onSave }) => {
  const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl);
  const [apiToken, setApiToken] = useState(config.apiToken);
  const [urlError, setUrlError] = useState<string|null>(null);
  const [tokenError, setTokenError] = useState<string|null>(null);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ok:boolean;message:string}|null>(null);

  useEffect(() => { setEndpointUrl(config.endpointUrl); setApiToken(config.apiToken); setUrlError(null); setTokenError(null); setTestResult(null); }, [config.endpointUrl, config.apiToken]);

  const validate = () => { const ue=validateUrl(endpointUrl); const te=validateToken(apiToken); setUrlError(ue); setTokenError(te); return !ue&&!te; };
  const handleSave = () => { if(!validate()) return; onSave({endpointUrl:endpointUrl.trim(),apiToken:apiToken.trim()}); setSaved(true); setTestResult(null); setTimeout(()=>setSaved(false),3500); };
  const handleTest = async () => { if(!validate()) return; setTesting(true); setTestResult(null); const error=await validateEndpoint(endpointUrl.trim(),apiToken.trim()); setTesting(false); setTestResult(error?{ok:false,message:error}:{ok:true,message:"Connection successful! A test log record was ingested."}); };

  const hasExistingConfig = Boolean(config.endpointUrl && config.apiToken);
  const isDirty = endpointUrl !== config.endpointUrl || apiToken !== config.apiToken;

  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:32}}>
      <Flex flexDirection="column" gap={24}>
        <Flex flexDirection="column" gap={8}>
          <Heading level={2}>Configuration</Heading>
          <Paragraph>Set the Log Ingest API endpoint and token with <code>logs.ingest</code> scope.</Paragraph>
        </Flex>

        <div style={{padding:"12px 16px",background:C.bgBlue,borderLeft:`4px solid ${C.blue}`,borderRadius:4}}>
          <Flex flexDirection="column" gap={6}>
            <Text>1. Dynatrace → <strong>Settings → Access tokens → Generate new token</strong></Text>
            <Text>2. Enable: <code>Ingest logs (logs.ingest)</code></Text>
            <Text>3. Endpoint: <code>https://{"<env-id>"}.live.dynatrace.com/api/v2/logs/ingest</code></Text>
            <Link href="https://docs.dynatrace.com/docs/dynatrace-api/environment-api/log-monitoring-v2/post-ingest-logs" target="_blank">Log Ingest API docs →</Link>
          </Flex>
        </div>

        {hasExistingConfig && !isDirty && (
          <Surface>
            <Flex flexDirection="column" gap={6} style={{padding:"12px 16px"}}>
              <Text style={{color:C.green}}><strong>✅ Configured</strong></Text>
              <Text><strong>Endpoint:</strong> {config.endpointUrl}</Text>
              <Text><strong>Token:</strong> {maskToken(config.apiToken)}</Text>
            </Flex>
          </Surface>
        )}

        <Divider />

        <Flex flexDirection="column" gap={16}>
          <FormField>
            <Label required>Endpoint URL</Label>
            <TextInput value={endpointUrl} onChange={(v)=>{setEndpointUrl(v);setUrlError(null);}} placeholder="https://abc12345.live.dynatrace.com/api/v2/logs/ingest" />
            {urlError&&<Text style={{color:C.red,fontSize:12}}>{urlError}</Text>}
          </FormField>
          <FormField>
            <Label required>API Token</Label>
            <TextInput type="password" value={apiToken} onChange={(v)=>{setApiToken(v);setTokenError(null);}} placeholder="dt0c01.XXXXXXXXXX…" />
            {tokenError&&<Text style={{color:C.red,fontSize:12}}>{tokenError}</Text>}
          </FormField>
        </Flex>

        {testResult&&<InlineAlert kind={testResult.ok?"success":"error"} title={testResult.ok?"Connection OK":"Connection Failed"}><Text>{testResult.message}</Text></InlineAlert>}
        {saved&&<InlineAlert kind="success" title="Saved"><Text>Configuration saved successfully.</Text></InlineAlert>}

        <Flex flexDirection="row" gap={12} alignItems="center">
          <Button variant="emphasized" onClick={handleSave}>Save Configuration</Button>
          <Button variant="default" onClick={handleTest} disabled={testing}>
            {testing?<Flex gap={8} alignItems="center"><ProgressCircle size="small"/><Text>Testing…</Text></Flex>:"Test Connection"}
          </Button>
        </Flex>

        <Divider />

        <Flex flexDirection="column" gap={6}>
          <Heading level={5}>Security Notes</Heading>
          <Text style={{opacity:0.7}}>• Token stored in browser <code>localStorage</code> — never sent anywhere except your Dynatrace endpoint.</Text>
          <Text style={{opacity:0.7}}>• Use a token with only the <code>logs.ingest</code> scope.</Text>
        </Flex>
      </Flex>
    </div>
  );
};
