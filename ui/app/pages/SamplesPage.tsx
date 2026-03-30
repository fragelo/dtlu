import React, { useState } from "react";
import { Flex, Divider, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Text, Paragraph } from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";

const C = {
  blue: "#1a6af4",
  bgBlue: "rgba(26,106,244,0.1)",
  bgCode: "rgba(128,128,128,0.15)",
  bgBadgeCsv: "rgba(26,106,244,0.15)",
  bgBadgeLog: "rgba(128,128,128,0.15)",
};

interface SampleFile { name: string; description: string; type: "csv"|"log"; content: string; uploadHint: string; }

const SAMPLES: SampleFile[] = [
  {
    name: "sample_application_logs.csv", type: "csv",
    description: "Application logs with severity, service name, HTTP details and message. No timestamp column — ingestion time will be used.",
    uploadHint: "✅ CSV file checked | timestamp checkbox: leave unchecked | optionally set log.type = 'application'",
    content: `severity,service.name,host.name,http.method,http.status_code,http.url,user.id,duration_ms,message
INFO,auth-service,web-host-01,POST,200,/api/auth/login,user_1042,45,User login successful
INFO,catalog-service,web-host-02,GET,200,/api/products,user_1042,87,Product catalog requested
WARN,api-gateway,web-host-02,GET,200,/api/products/search,user_1099,532,Response time exceeded threshold 500ms
ERROR,order-service,db-host-01,POST,503,/api/orders,user_1042,30012,Database connection timeout after 30s
ERROR,order-service,db-host-01,POST,503,/api/orders,user_1042,5001,Retry attempt 1 of 3 for order creation
INFO,order-service,db-host-01,POST,201,/api/orders,user_1042,4823,Order created successfully on retry 3
INFO,payment-service,web-host-03,POST,200,/api/payments/confirm,user_1042,1203,Payment processed successfully order ORD-9912
DEBUG,cache-service,cache-host-01,GET,200,/internal/cache/stats,,3,Cache hit ratio 87 percent
WARN,system-monitor,web-host-02,GET,200,/internal/health,,1,High memory usage 89 percent on web-host-02
ERROR,cart-service,web-host-03,POST,500,/api/cart/checkout,user_1077,234,Null pointer exception in CartController line 42
ERROR,payment-service,web-host-03,POST,504,/api/payments/stripe,user_1088,30001,Failed to connect to external payment gateway timeout
INFO,payment-service,web-host-03,POST,200,/api/payments/paypal,user_1088,1456,Fallback payment gateway used successfully
WARN,api-gateway,web-host-01,GET,429,/api/products,,0,Rate limit applied to IP 192.168.1.105 exceeded 100 req per min
INFO,auth-service,web-host-01,POST,201,/api/auth/register,user_1103,312,New user registration completed
ERROR,auth-service,web-host-01,POST,401,/api/auth/login,user_1200,12,Invalid credentials attempt 3 of 5 account will be locked
ERROR,auth-service,web-host-01,POST,423,/api/auth/login,user_1200,8,Account locked after 5 failed login attempts
INFO,shipping-service,web-host-03,POST,200,/api/shipping/label,user_1042,678,Shipping label generated for order ORD-9912
WARN,order-service,db-host-01,GET,200,/api/orders/pending,,45,Pending orders queue size 450 approaching limit 500
INFO,health-monitor,web-host-01,GET,200,/health,,2,Health check passed all services nominal`,
  },
  {
    name: "sample_generic.log", type: "log",
    description: "Plain text log file — mixed formats, no structure. Each line becomes one log record with the full line as content. Timestamp = ingestion time.",
    uploadHint: "❌ CSV file unchecked | optionally set log.type = 'application'",
    content: `[2026-03-30 08:00:01] INFO  Starting application server on port 8080
[2026-03-30 08:00:01] INFO  Loading configuration from /etc/app/config.yaml
[2026-03-30 08:00:02] INFO  Connected to database host=db-host-01 port=5432
[2026-03-30 08:00:02] WARN  Connection pool size 10 is below recommended minimum of 20
[2026-03-30 08:00:03] INFO  Cache warmed up 12453 entries loaded in 1.2s
[2026-03-30 08:00:05] INFO  Application ready — accepting requests
[2026-03-30 08:00:12] INFO  GET /api/products 200 87ms user=user_1042
[2026-03-30 08:00:14] WARN  Slow query detected: SELECT * FROM orders WHERE status=pending took 2340ms
[2026-03-30 08:00:15] INFO  POST /api/orders 201 4823ms user=user_1042
[2026-03-30 08:00:20] ERROR Exception in thread http-nio-8080-exec-3 java.lang.NullPointerException
[2026-03-30 08:00:20] ERROR   at com.example.CartController.checkout line 42
[2026-03-30 08:00:25] WARN  JVM heap usage at 78% consider increasing Xmx
[2026-03-30 08:00:30] INFO  GET /health 200 2ms
[2026-03-30 08:00:35] ERROR Connection to stripe.com timed out after 30000ms
[2026-03-30 08:00:36] INFO  Failover to PayPal gateway initiated
[2026-03-30 08:00:37] INFO  POST /api/payments/paypal 200 1456ms user=user_1088
[2026-03-30 08:00:45] WARN  Rate limit triggered for IP 192.168.1.105 429 Too Many Requests
[2026-03-30 08:01:00] INFO  Scheduled task inventory-sync started
[2026-03-30 08:01:08] INFO  Scheduled task inventory-sync completed 1243 records processed in 8.7s
[2026-03-30 08:01:15] ERROR SSL handshake failed for host external-api.partner.com
[2026-03-30 08:01:20] WARN  Disk usage on /var/log is at 91% consider log rotation
[2026-03-30 08:01:30] INFO  User user_1200 account locked after 5 consecutive failed logins
[2026-03-30 08:01:47] INFO  Application stopped cleanly`,
  },
];

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export const SamplesPage: React.FC = () => {
  const [expanded, setExpanded] = useState<string|null>(null);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 32 }}>
      <Flex flexDirection="column" gap={24}>
        <Flex flexDirection="column" gap={8}>
          <Heading level={2}>Sample Files</Heading>
          <Paragraph>Download these sample files to test the app. Each file demonstrates a different upload scenario.</Paragraph>
        </Flex>

        {SAMPLES.map((sample) => (
          <Surface key={sample.name}>
            <Flex flexDirection="column" gap={12} style={{ padding: "16px 20px" }}>
              <Flex flexDirection="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={12}>
                <Flex flexDirection="column" gap={4}>
                  <Flex flexDirection="row" alignItems="center" gap={8}>
                    <span style={{ fontSize: 20 }}>{sample.type === "csv" ? "📊" : "📄"}</span>
                    <Text><strong style={{ fontFamily: "monospace" }}>{sample.name}</strong></Text>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: sample.type === "csv" ? C.bgBadgeCsv : C.bgBadgeLog, color: sample.type === "csv" ? C.blue : "inherit", fontWeight: 600 }}>{sample.type.toUpperCase()}</span>
                  </Flex>
                  <Text>{sample.description}</Text>
                </Flex>
                <Button variant="emphasized" onClick={() => downloadFile(sample.name, sample.content)}>⬇ Download</Button>
              </Flex>

              <div style={{ padding: "8px 12px", background: C.bgBlue, borderRadius: 4, borderLeft: `3px solid ${C.blue}` }}>
                <Text style={{ fontSize: 13 }}><strong>How to upload:</strong> {sample.uploadHint}</Text>
              </div>

              <button onClick={() => setExpanded(expanded === sample.name ? null : sample.name)} style={{ background: "none", border: "none", cursor: "pointer", color: C.blue, fontSize: 13, padding: 0, textAlign: "left" }}>
                {expanded === sample.name ? "▲ Hide preview" : "▼ Show preview"}
              </button>

              {expanded === sample.name && (
                <pre style={{ background: C.bgCode, borderRadius: 6, padding: "10px 14px", fontFamily: "monospace", fontSize: 12, overflow: "auto", maxHeight: 240, margin: 0, whiteSpace: "pre" }}>
                  {sample.content.split("\n").slice(0, 10).join("\n")}
                  {sample.content.split("\n").length > 10 ? `\n… and ${sample.content.split("\n").length - 10} more lines` : ""}
                </pre>
              )}
            </Flex>
          </Surface>
        ))}

        <Divider />

        <Surface>
          <Flex flexDirection="column" gap={8} style={{ padding: "14px 18px" }}>
            <Heading level={5}>After uploading — query your logs in DQL</Heading>
            <pre style={{ background: C.bgCode, borderRadius: 6, padding: "10px 14px", fontFamily: "monospace", fontSize: 13, margin: 0 }}>
{`fetch logs
| filter service.name == "order-service"
| sort timestamp desc

fetch logs
| filter severity == "ERROR"
| fields timestamp, severity, service.name, message

fetch logs
| filter contains(content, "timeout")

fetch logs
| filter log.type == "application"
| sort timestamp desc`}
            </pre>
          </Flex>
        </Surface>
      </Flex>
    </div>
  );
};
