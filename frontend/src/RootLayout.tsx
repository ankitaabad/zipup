import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";
import { useDisclosure } from "@mantine/hooks";
import "@mantine/core/styles.css";
// import '@mantine/charts/styles.css';
import '@mantine/notifications/styles.css'; 
import "./styles/loader.css";

import { AppSidebar } from "./components/Sidebar";
// import "react-pro-sidebar/dist/css/styles.css";

export default function RootLayout() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      padding="md"
      // header={{ height: 60 }}/
      withBorder={false}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened }
      }}
    >
      {/* <AppShell.Header>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

          <div>Logo</div>
        </AppShell.Header> */}

      <AppShell.Navbar>
        <AppSidebar />
      </AppShell.Navbar>

      <AppShell.Main
        bg={"#F6F4F5"}
        style={{
          display: "flex",
          flexDirection: "column"
        }}
      >
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
