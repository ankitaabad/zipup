import React from "react";
import ReactDOM from "react-dom/client";
import {
  createTheme,
  MantineColorsTuple,
  MantineProvider
} from "@mantine/core";
import { BrowserRouter, Scripts, ScrollRestoration } from "react-router-dom";
import App from "./App";
import { theme } from "./theme";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
    {/* <ScrollRestoration />
    <Scripts /> */}
  </React.StrictMode>
);
