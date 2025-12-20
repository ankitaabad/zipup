import { Routes, Route, BrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
// import Users from "./pages/Users";
import Settings from "./pages/Settings";
import RootLayout from "./RootLayout";

export default function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Dashboard />} />
          {/* <Route path="/users" element={<Users />} /> */}
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
