const STORAGE_KEY = "csv-log-uploader-config";

export interface AppConfig {
  endpointUrl: string;
  apiToken: string;
}

const DEFAULT_CONFIG: AppConfig = {
  endpointUrl: "",
  apiToken: "",
};

import { useEffect, useState } from "react";

export function useAppConfig() {
  const [config, setConfigState] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConfigState(JSON.parse(raw));
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, []);

  const saveConfig = (newConfig: AppConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    setConfigState(newConfig);
  };

  const clearConfig = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfigState(DEFAULT_CONFIG);
  };

  return { config, saveConfig, clearConfig, isLoaded };
}
