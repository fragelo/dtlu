import React, { useState } from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { ProgressCircle } from "@dynatrace/strato-components/content";
import { useAppConfig } from "./hooks/useAppConfig";
import { UploadPage } from "./pages/UploadPage";
import { ConfigPage } from "./pages/ConfigPage";
import { InstructionsPage } from "./pages/InstructionsPage";
import { SamplesPage } from "./pages/SamplesPage";

type Page = "upload" | "config" | "instructions" | "samples";

export default function App() {
  const { config, saveConfig, isLoaded } = useAppConfig();
  const [currentPage, setCurrentPage] = useState<Page>("upload");

  if (!isLoaded) {
    return (
      <Flex justifyContent="center" alignItems="center" style={{ height: "100vh" }}>
        <ProgressCircle />
      </Flex>
    );
  }

  const navBtn = (page: Page, label: string) => (
    <button
      onClick={() => setCurrentPage(page)}
      style={{
        padding: "8px 20px",
        borderRadius: 4,
        border: "none",
        cursor: "pointer",
        fontWeight: currentPage === page ? 700 : 400,
        fontSize: 14,
        background: currentPage === page ? "#1a6af4" : "transparent",
        color: currentPage === page ? "#fff" : "inherit",
        opacity: currentPage === page ? 1 : 0.7,
      }}
    >
      {label}
    </button>
  );

  return (
    <Flex flexDirection="column" style={{ minHeight: "100vh" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 24px",
        borderBottom: "1px solid rgba(128,128,128,0.2)",
        background: "var(--dt-colors-background-surface-default, transparent)",
        flexWrap: "wrap",
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, marginRight: 24, opacity: 0.9 }}>
          📤 Dynatrace Log Uploader
        </span>
        {navBtn("upload", "Upload")}
        {navBtn("instructions", "📖 Instructions")}
        {navBtn("samples", "📁 Sample Files")}
        {navBtn("config", "⚙ Configuration")}
      </div>
      <Flex flexDirection="column" flex={1}>
        {currentPage === "upload" && <UploadPage config={config} onNavigateToConfig={() => setCurrentPage("config")} />}
        {currentPage === "instructions" && <InstructionsPage />}
        {currentPage === "samples" && <SamplesPage />}
        {currentPage === "config" && <ConfigPage config={config} onSave={saveConfig} />}
      </Flex>
    </Flex>
  );
}
