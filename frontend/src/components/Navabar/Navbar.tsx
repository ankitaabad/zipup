import { useState } from "react";
import {
  IconBrandWebflow,
  IconDashboard,
  IconLogout,
  IconSearch,
  IconSettings,
  IconSitemap,
  IconSwitchHorizontal,
  IconPlus,
} from "@tabler/icons-react";
import {
  Box,
  NavLink,
  ScrollArea,
  Stack,
  Group,
  Text,
  Code,
  Button,
  Divider,
  Modal,
  TextInput,
} from "@mantine/core";

export function Navbar() {
  const [active, setActive] = useState<string | null>(null);
  const [staticSites, setStaticSites] = useState<string[]>(["Site 1", "Site 2"]);
  const [webApps, setWebApps] = useState<string[]>(["App 1", "App 2"]);

  const [modalOpened, setModalOpened] = useState(false);
  const [modalFor, setModalFor] = useState<"static" | "web" | null>(null);
  const [newName, setNewName] = useState("");
  const [newSubdomain, setNewSubdomain] = useState("");

  const openModal = (type: "static" | "web") => {
    setModalFor(type);
    setNewName("");
    setNewSubdomain("");
    setModalOpened(true);
  };

  const saveNewItem = () => {
    if (!newName.trim()) return;

    if (modalFor === "static") {
      setStaticSites([...staticSites, newName]);
    } else if (modalFor === "web") {
      setWebApps([...webApps, newName]);
    }

    setModalOpened(false);
  };

  return (
    <Box
      h="100vh"
      bg="gray.0"
      style={{ borderRight: "1px solid #e4e4e4" }}
      p="md"
    >
      {/* HEADER */}
      <Group justify="space-between" mb="md">
        <Text ff="Leckerli One" fw={700} size="xl" c="#452829">
          Passup
        </Text>
        <Code fw={700}>v3.1.2</Code>
      </Group>

      <Divider mb="md" />

      <ScrollArea h="calc(100% - 120px)">
        <Stack gap={4}>
          {/* Dashboard */}
          <NavLink
            label="Dashboard"
            leftSection={<IconDashboard size={18} />}
            active={active === "Dashboard"}
            onClick={() => setActive("Dashboard")}
            variant="light"
            radius="sm"
          />

          {/* Static Sites */}
          <NavLink
            label="Static Sites"
            leftSection={<IconSitemap size={18} />}
            rightSection={
              <Button
                size="xs"
                variant="light"
                compact
                onClick={(e) => {
                  e.stopPropagation(); // prevent NavLink click
                  openModal("static");
                }}
              >
                <IconPlus size={14} />
              </Button>
            }
            childrenOffset={24}
            defaultOpened
            variant="filled"
            radius="md"
          >
            <Stack spacing={2}>
              {staticSites.map((site) => (
                <NavLink
                  key={site}
                  label={site}
                  active={active === site}
                  onClick={() => setActive(site)}
                  variant="light"
                  radius="sm"
                  style={{ paddingTop: 4, paddingBottom: 4 }}
                />
              ))}
            </Stack>
          </NavLink>

          {/* Web Apps */}
          <NavLink
            label="Web Apps"
            leftSection={<IconBrandWebflow size={18} />}
            rightSection={
              <Button
                size="xs"
                variant="light"
                compact
                onClick={(e) => {
                  e.stopPropagation();
                  openModal("web");
                }}
              >
                <IconPlus size={14} />
              </Button>
            }
            childrenOffset={24}
            defaultOpened
            variant="filled"
            radius="md"
          >
            <Stack spacing={2}>
              {webApps.map((app) => (
                <NavLink
                  key={app}
                  label={app}
                  active={active === app}
                  onClick={() => setActive(app)}
                  variant="light"
                  radius="sm"
                  style={{ paddingTop: 4, paddingBottom: 4 }}
                />
              ))}
            </Stack>
          </NavLink>

          {/* Logs */}
          <NavLink
            label="Logs"
            leftSection={<IconSearch size={18} />}
            active={active === "logs"}
            onClick={() => setActive("logs")}
            variant="light"
            radius="sm"
          />

          {/* Settings */}
          <NavLink
            label="Settings"
            leftSection={<IconSettings size={18} />}
            active={active === "settings"}
            onClick={() => setActive("settings")}
            variant="light"
            radius="sm"
          />
        </Stack>

        {/* FOOTER */}
        <Box mt="xl">
          <Divider mb="sm" />
          <Stack spacing={4}>
            <NavLink
              label="Change account"
              leftSection={<IconSwitchHorizontal size={18} />}
              variant="subtle"
              radius="sm"
            />
            <NavLink
              label="Logout"
              leftSection={<IconLogout size={18} />}
              variant="subtle"
              c="red"
              radius="sm"
            />
          </Stack>
        </Box>
      </ScrollArea>

      {/* MODAL */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={`Create ${modalFor === "static" ? "Static Site" : "Web App"}`}
        centered
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="Enter name"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />
          <TextInput
            label="Subdomain"
            placeholder="Enter subdomain"
            value={newSubdomain}
            onChange={(e) => setNewSubdomain(e.currentTarget.value)}
          />
          <Button fullWidth onClick={saveNewItem}>
            Save
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
