import { useState } from "react";
import {
  Sidebar,
  Menu,
  MenuItem,
  SubMenu,
} from "react-pro-sidebar";
import {
  IconLayoutDashboard,
  IconWorld,
  IconAppWindow,
  IconFileText,
  IconSettings,
  IconLogout,
  IconSwitchHorizontal,
  IconPlus,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  Box,
  Group,
  Text,
  Code,
  Divider,
  Modal,
  Stack,
  TextInput,
  Button,
} from "@mantine/core";

/* ----------------------------- Sidebar ----------------------------- */

export function AppSidebar() {
  const [active, setActive] = useState<string | null>("Dashboard");

  const [staticSites, setStaticSites] = useState(["Marketing", "Docs"]);
  const [webApps, setWebApps] = useState(["API", "Admin"]);

  const [modalOpened, setModalOpened] = useState(false);
  const [modalFor, setModalFor] = useState<"static" | "web" | null>(null);
  const [newName, setNewName] = useState("");

  const openCreate = (type: "static" | "web") => {
    setModalFor(type);
    setNewName("");
    setModalOpened(true);
  };

  const saveItem = () => {
    if (!newName.trim()) return;

    if (modalFor === "static") {
      setStaticSites((s) => [...s, newName]);
    } else {
      setWebApps((s) => [...s, newName]);
    }

    setModalOpened(false);
  };

  return (
    <>
      <Sidebar
        width="260px"
        style={{
          height: "100vh",
          borderRight: "1px solid var(--mantine-color-gray-0)",
          backgroundColor: "#F8F9FA"
        }}
      >
        {/* Brand */}
        <Box px="md" py="sm">
          <Group justify="space-between">
            <Text fw={700} size="lg" style={{ letterSpacing: -0.3 }}>
              Passup
            </Text>
            <Code size="xs">v3.1.2</Code>
          </Group>
        </Box>

        <Divider />

        <Menu>

          <MenuItem
            icon={<IconLayoutDashboard size={18} />}
            active={active === "Dashboard"}
            onClick={() => setActive("Dashboard")}
          >
            Dashboard
          </MenuItem>

          {/* Static Sites */}
          <SubMenu
            label="Static Sites"
            icon={<IconWorld size={18} />}
            // suffix={<IconChevronRight size={14} />}
          >
            {staticSites.map((site) => (
              <MenuItem
                key={site}
                active={active === site}
                onClick={() => setActive(site)}
              >
                {site}
              </MenuItem>
            ))}

            <MenuItem
              icon={<IconPlus size={16} />}
              onClick={() => openCreate("static")}
              style={{ opacity: 0.7 }}
            >
              New static site
            </MenuItem>
          </SubMenu>

          {/* Web Apps */}
          <SubMenu
            label="Web Apps"
            icon={<IconAppWindow size={18} />}
            // suffix={<IconChevronRight size={14} />}
          >
            {webApps.map((app) => (
              <MenuItem
                key={app}
                active={active === app}
                onClick={() => setActive(app)}
              >
                {app}
              </MenuItem>
            ))}

            <MenuItem
              icon={<IconPlus size={16} />}
              onClick={() => openCreate("web")}
              style={{ opacity: 0.7 }}
            >
              New web app
            </MenuItem>
          </SubMenu>

          <MenuItem
            icon={<IconFileText size={18} />}
            active={active === "Logs"}
            onClick={() => setActive("Logs")}
          >
            Logs
          </MenuItem>

          <MenuItem
            icon={<IconSettings size={18} />}
            active={active === "Settings"}
            onClick={() => setActive("Settings")}
          >
            Settings
          </MenuItem>
        </Menu>

        {/* Footer */}
        <Box mt="auto" px="md" py="sm">
          <Divider mb="sm" />
          <Menu>
            <MenuItem icon={<IconSwitchHorizontal size={18} />}>
              Change account
            </MenuItem>
            <MenuItem
              icon={<IconLogout size={18} />}
              style={{ color: "var(--mantine-color-red-6)" }}
            >
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Sidebar>

      {/* Create Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={
          modalFor === "static"
            ? "Create static site"
            : "Create web app"
        }
        centered
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="eg. marketing-site"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />
          <Button onClick={saveItem}>Create</Button>
        </Stack>
      </Modal>
    </>
  );
}
