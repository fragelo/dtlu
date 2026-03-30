import React from "react";
import ReactDOM from "react-dom/client";
import { AppRoot } from "@dynatrace/strato-components";
import { IntlProvider } from "react-intl";
import App from "./app/App";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppRoot>
      <IntlProvider locale="en" defaultLocale="en">
        <App />
      </IntlProvider>
    </AppRoot>
  </React.StrictMode>
);
