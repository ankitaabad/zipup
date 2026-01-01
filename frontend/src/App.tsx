import { Routes, Route, BrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";
import AppLayout from "./pages/AppLayout"; // New page for app details with tabs
import RootLayout from "./RootLayout";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/">
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/logs" element={<Logs />} />

            {/* Apps with tabs */}
            <Route path="/apps/:type/:appId" element={<AppLayout />} />
            <Route path="/apps/:type/:appId/:tab" element={<AppLayout />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
