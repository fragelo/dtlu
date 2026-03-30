import React, { useState } from "react";
import { Flex, Divider, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Text, Paragraph } from "@dynatrace/strato-components/typography";

const C = {
  blue: "#4d8af0",
  green: "#4caf7d",
  orange: "#e8914a",
  bgBlue: "rgba(77,138,240,0.12)",
  bgGreen: "rgba(76,175,125,0.12)",
  bgOrange: "rgba(232,145,74,0.12)",
  bgCode: "rgba(128,128,128,0.15)",
  borderCode: "rgba(128,128,128,0.2)",
  divider: "rgba(128,128,128,0.2)",
};

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{
        minWidth: 32, height: 32, borderRadius: "50%",
        background: C.bgBlue, border: `2px solid ${C.blue}`,
        color: C.blue, display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 14, flexShrink: 0,
      }}>{number}</div>
      <Flex flexDirection="column" gap={8} style={{ flex: 1 }}>
        <Text><strong>{title}</strong></Text>
        {children}
      </Flex>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre style={{
      background: C.bgCode, border: `1px solid ${C.borderCode}`,
      borderRadius: 6, padding: "10px 14px", fontFamily: "monospace",
      fontSize: 13, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
    }}>{children}</pre>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Flex flexDirection="column" gap={16}>
      <Flex flexDirection="row" alignItems="center" gap={12}>
        <div style={{ width: 4, height: 20, background: C.blue, borderRadius: 2, opacity: 0.8 }} />
        <Heading level={4}>{title}</Heading>
      </Flex>
      {children}
    </Flex>
  );
}

export const InstructionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"permissions" | "token">("permissions");

  const tabBtn = (tab: "permissions" | "token", label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        padding: "8px 20px", border: "none", cursor: "pointer", fontSize: 14,
        borderBottom: activeTab === tab ? `2px solid ${C.blue}` : `2px solid transparent`,
        fontWeight: activeTab === tab ? 700 : 400,
        background: "transparent",
        color: activeTab === tab ? C.blue : "inherit",
        opacity: activeTab === tab ? 1 : 0.6,
      }}
    >{label}</button>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 32 }}>
      <Flex flexDirection="column" gap={24}>
        <Flex flexDirection="column" gap={8}>
          <Heading level={2}>Setup Instructions</Heading>
          <Paragraph>Follow these steps to configure the required permissions and access token before using the app.</Paragraph>
        </Flex>

        <div style={{ borderBottom: `1px solid ${C.divider}`, display: "flex", gap: 0 }}>
          {tabBtn("permissions", "🔐 IAM Permissions")}
          {tabBtn("token", "🔑 Access Token")}
        </div>

        {activeTab === "permissions" && (
          <Flex flexDirection="column" gap={24}>
            <Surface>
              <div style={{ padding: "12px 16px", borderLeft: `4px solid ${C.blue}`, borderRadius: 4, background: C.bgBlue }}>
                <Text>The app uses <code>logsClient</code> from the Dynatrace SDK which authenticates via your session. Your user must have the <code>storage:logs:write</code> and <code>storage:buckets:read</code> permissions granted through an IAM policy bound to your environment.</Text>
              </div>
            </Surface>

            <Section title="Step 1 — Create the IAM Policy">
              <Step number={1} title="Go to Account Management">
                <Text>Navigate to <code>myaccount.dynatrace.com</code></Text>
              </Step>
              <Step number={2} title="Open Policy management">
                <Text>Click <strong>Identity &amp; access management → Policy management</strong></Text>
              </Step>
              <Step number={3} title="Create a new policy">
                <Flex flexDirection="column" gap={8}>
                  <Text>Click <strong>Create policy</strong> and fill in:</Text>
                  <CodeBlock>{`Policy name: log-uploader-write\n\nPolicy statement:\nALLOW storage:logs:write;\nALLOW storage:buckets:read;`}</CodeBlock>
                  <Text>Click <strong>Save</strong></Text>
                </Flex>
              </Step>
            </Section>

            <Divider />

            <Section title="Step 2 — Create a Group and Bind the Policy">
              <Step number={1} title="Open Group management">
                <Text>Click <strong>Identity &amp; access management → Group management → Create group</strong></Text>
              </Step>
              <Step number={2} title="Name the group">
                <CodeBlock>log-uploader-users</CodeBlock>
              </Step>
              <Step number={3} title="Add the policy to the group">
                <Flex flexDirection="column" gap={8}>
                  <Text>Inside the group, click <strong>+ Permission</strong> and select:</Text>
                  <CodeBlock>{`Permission: log-uploader-write\nScope: <your environment, e.g. "My Demo">`}</CodeBlock>
                  <Text>Make sure the scope matches the environment where the app is installed.</Text>
                </Flex>
              </Step>
            </Section>

            <Divider />

            <Section title="Step 3 — Add Your User to the Group">
              <Step number={1} title="Open User management">
                <Text>Click <strong>Identity &amp; access management → User management</strong></Text>
              </Step>
              <Step number={2} title="Find your user">
                <Text>Search for your email address and click on it.</Text>
              </Step>
              <Step number={3} title="Add to group">
                <Text>Add the user to the group <code>log-uploader-users</code> and save.</Text>
              </Step>
            </Section>

            <Surface>
              <div style={{ padding: "12px 16px", background: C.bgGreen, borderLeft: `4px solid ${C.green}`, borderRadius: 4 }}>
                <Text><strong>✅ Done!</strong> The app will now be able to ingest logs on behalf of your user session. No token needed for the upload itself.</Text>
              </div>
            </Surface>
          </Flex>
        )}

        {activeTab === "token" && (
          <Flex flexDirection="column" gap={24}>
            <Surface>
              <div style={{ padding: "12px 16px", borderLeft: `4px solid ${C.blue}`, borderRadius: 4, background: C.bgBlue }}>
                <Text>The <strong>Configuration page</strong> of this app accepts an API token as an alternative ingest method. The token must have the <code>logs.ingest</code> scope. This is optional — the app works without a token if IAM permissions are configured.</Text>
              </div>
            </Surface>

            <Section title="Create an API Token with logs.ingest scope">
              <Step number={1} title="Open your Dynatrace environment">
                <Text>Go to your environment URL, e.g. <code>https://nnr75930.apps.dynatrace.com</code></Text>
              </Step>
              <Step number={2} title="Navigate to Access Tokens">
                <Text>Go to <strong>Settings → Access tokens</strong> (or search "access tokens" in the top bar)</Text>
              </Step>
              <Step number={3} title="Generate a new token">
                <Flex flexDirection="column" gap={8}>
                  <Text>Click <strong>Generate new token</strong> and fill in:</Text>
                  <CodeBlock>{`Token name: log-uploader-ingest\nScope:      ✅ Ingest logs (logs.ingest)`}</CodeBlock>
                  <Text>Click <strong>Generate token</strong> and <strong>copy it immediately</strong> — it won't be shown again.</Text>
                </Flex>
              </Step>
              <Step number={4} title="Configure the app">
                <Flex flexDirection="column" gap={8}>
                  <Text>Go to the <strong>Configuration</strong> tab in this app and enter:</Text>
                  <CodeBlock>{`Endpoint URL: https://<env-id>.live.dynatrace.com/api/v2/logs/ingest\nAPI Token:    dt0c01.XXXXXXXXXXXX...`}</CodeBlock>
                  <Text>Click <strong>Save Configuration</strong> then <strong>Test Connection</strong> to verify.</Text>
                </Flex>
              </Step>
            </Section>

            <Surface>
              <div style={{ padding: "12px 16px", background: C.bgOrange, borderLeft: `4px solid ${C.orange}`, borderRadius: 4 }}>
                <Text><strong>⚠ Security note:</strong> The token is stored in your browser's <code>localStorage</code> only. Use a dedicated token with only the <code>logs.ingest</code> scope — never use an admin token.</Text>
              </div>
            </Surface>
          </Flex>
        )}
      </Flex>
    </div>
  );
};
