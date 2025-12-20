import { AppShell, Burger } from "@mantine/core";
import { Outlet } from "react-router-dom";
import { useDisclosure } from "@mantine/hooks";
import { Navbar } from "./components/Navabar/Navbar";
import "@mantine/core/styles.css";
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
        <Navbar />
      </AppShell.Navbar>

      <AppShell.Main bg={"#F6F4F5"}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
