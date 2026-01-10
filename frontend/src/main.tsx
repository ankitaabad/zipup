import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import App from "./App";
import { theme } from "./theme";
import { Notifications } from "@mantine/notifications";
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <Notifications />
      <App />
    </MantineProvider>
    {/* <ScrollRestoration />
    <Scripts /> */}
  </React.StrictMode>
);
