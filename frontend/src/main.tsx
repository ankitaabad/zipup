import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter, Scripts, ScrollRestoration } from "react-router-dom";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider
      theme={{
        components: {
          Button: {
            styles: {
              root: {
                minWidth: "8ch" // minimum width ~ 8 characters
              }
            }
          }
        }
      }}
    >
      <App />
    </MantineProvider>
    {/* <ScrollRestoration />
    <Scripts /> */}
  </React.StrictMode>
);
