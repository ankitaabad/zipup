import { Routes, Route, BrowserRouter } from "react-router-dom";
import Logs from "./pages/Logs";
import AppLayout from "./pages/AppLayout"; // New page for app details with tabs
import RootLayout from "./RootLayout";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppStatsDashboard from "./components/AppStatsDashboard";
import { Login } from "./components/Login";
import { Settings } from "./pages/Settings";
import { Wireguard } from "./components/Wireguard";
import { AuthGuard } from "./components/AuthGuard";
import { CustomLoader } from "./components/CustomLoader";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 0.5 * 60 * 1000
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/loader" element={<CustomLoader />} />
          <Route element={<AuthGuard />}>
            <Route element={<RootLayout />}>
              <Route path="/" element={<AppStatsDashboard />} />
              {/* <Route path="/dashboard" element={<AppStatsDashboard />} /> */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/wireguard" element={<Wireguard />} />
              {/* Apps with tabs */}
              <Route path="/apps/:type/:appId" element={<AppLayout />} />
              <Route path="/apps/:type/:appId/:tab" element={<AppLayout />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
