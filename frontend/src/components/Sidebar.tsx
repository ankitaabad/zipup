import { useState, useEffect } from "react";
import logoImage from "../../public/logo.svg";

import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import {
  IconLayoutDashboard,
  IconWorld,
  IconAppWindow,
  IconFileText,
  IconSettings,
  IconLogout,
  IconPlus,
  IconLockBolt,
  IconBrandJavascript,
  IconScript,
  IconApiApp,
  IconApps
} from "@tabler/icons-react";
import {
  Box,
  Group,
  Text,
  Code,
  Divider,
  Stack,
  TextInput,
  Button,
  useMantineTheme,
  Image
} from "@mantine/core";
import { useApps, useCreateApp } from "../apis/apps";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { CustomModal } from "./CustomModal";
import { useAdminLogout } from "../apis/adminAuth";

/* ----------------------------- Sidebar ----------------------------- */

type Site = {
  id: string;
  name: string;
};

const useSidebarRoute = () => {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  return {
    isDashboard: pathname === "/",
    isGlobalSettings: pathname === "/settings",
    isWireguardSettings: pathname === "/wireguard",
    isAppRoute: parts[0] === "apps",
    appType: parts[1], // static | web
    appId: parts[2] // the sidebar item
  };
};
export function AppSidebar() {
  console.log("AppSidebar called");
  const theme = useMantineTheme();
  const sidebarRoute = useSidebarRoute();
  console.log({ sidebarRoute });
  const appsQuery = useApps();
  const navigate = useNavigate();
  const location = useLocation();
  const logoutMutation = useAdminLogout();
  const [staticSites, setStaticSites] = useState<Site[]>([]);
  const [webApps, setWebApps] = useState<Site[]>([]);
  const createAppMutation = useCreateApp();
  const [modalOpened, setModalOpened] = useState(false);
  const [modalFor, setModalFor] = useState<"static" | "web" | null>(null);
  const [newName, setNewName] = useState("");

  const [staticMenuOpen, setStaticMenuOpen] = useState(
    sidebarRoute.appType === "static"
  );
  const [webMenuOpen, setWebMenuOpen] = useState(
    sidebarRoute.appType === "web"
  );
  /* ---------------- derive active from route ---------------- */
  let activeSection: string = "Dashboard"; // Dashboard / Logs / Settings / Apps
  let activeAppId: string | null = null; // if inside static/web app

  // const pathParts = location.pathname.split("/").filter(Boolean);
  // if (pathParts[0] === "logs") activeSection = "Logs";
  // else if (pathParts[0] === "settings") activeSection = "Settings";
  // else if (pathParts[0] === "apps") {
  //   activeSection = "Apps";
  //   activeAppId = pathParts[2] || null; // apps/static/:appId or apps/web/:appId
  // } else {
  //   activeSection = "Dashboard";
  // }

  /* ---------------- update apps state when query succeeds ---------------- */
  useEffect(() => {
    if (appsQuery.isSuccess && appsQuery.data?.data) {
      const data = appsQuery.data.data;
      setStaticSites(
        data
          .filter((a) => a.type === "STATIC")
          .map((a) => ({ id: a.id, name: a.name }))
      );
      setWebApps(
        data
          .filter((a) => a.type !== "STATIC")
          .map((a) => ({ id: a.id, name: a.name }))
      );
    }
  }, [appsQuery.data, appsQuery.isSuccess]);

  /* ---------------- create new site/app ---------------- */
  const openCreate = (type: "static" | "web") => {
    setModalFor(type);
    setNewName("");
    setModalOpened(true);
  };

  const saveItem = () => {
    if (!newName.trim() || !modalFor) return;

    createAppMutation.mutate(
      {
        name: newName.trim(),
        type: modalFor === "static" ? "STATIC" : "DYNAMIC"
      },
      {
        onSuccess: (data) => {
          setModalOpened(false);
          setNewName("");

          // Optional: navigate to the newly created app
          const appId = data?.data?.id;
          if (appId) {
            navigate(`/apps/${modalFor}/${appId}/settings`);
          }
        }
      }
    );
  };

  /* ---------------- handle app click ---------------- */
  const onSelectApp = (appType: "static" | "web", appId: string) => {
    navigate(`/apps/${appType}/${appId}/settings`);
  };

  return (
    <>
      <Sidebar
        width="260px"
        style={{
          height: "100vh",
          borderRight: "1px solid var(--mantine-color-gray-3)",
          backgroundColor: "var(--mantine-color-gray-0)"
        }}
      >
        {/* Brand */}
        <Box px="md" py="sm">
          <Group justify="space-between">
            <Text fw={700} size="xl" style={{ letterSpacing: -0.3 }}>
              {/* <span style={{ color: theme.colors.gray[8] }}>zip</span>
              <span style={{ color: "var(--mantine-primary-color-7)" }}>
                up
              </span> */}
              <Link to="/">
                <Image
                  src={logoImage}
                  h={35}
                  w="auto"
                  fit="contain"
                  mx="auto"
                />
              </Link>
            </Text>
            {/* <Code size="xs">v3.1.2</Code> */}
          </Group>
        </Box>

        <Divider />

        <Menu
          menuItemStyles={{
            button: ({ active }) => ({
              backgroundColor: active ? theme.colors.gray[2] : "transparent",
              "&:hover": { backgroundColor: theme.colors.gray[2] },
              fontWeight: active ? 600 : 400,
              boxShadow: active
                ? "inset  6px 0 0 var(--mantine-primary-color-7)"
                : "none"
            })
          }}
        >
          {/* Dashboard */}
          <MenuItem
            icon={<IconLayoutDashboard size={18} />}
            active={sidebarRoute.isDashboard}
            onClick={() => {
              setStaticMenuOpen(false);
              setWebMenuOpen(false);
              navigate("/");
            }}
          >
            Dashboard
          </MenuItem>

          {/* Static Sites */}
          <SubMenu
            label="Static Sites"
            icon={<IconWorld size={18} />}
            open={staticMenuOpen}
            onClick={() => {
              setStaticMenuOpen(!staticMenuOpen);
              setWebMenuOpen(false);
            }}
          >
            {staticSites.map((site) => (
              <MenuItem
                key={site.id}
                active={sidebarRoute.appId === site.id}
                onClick={() => onSelectApp("static", site.id)}
              >
                {site.name}
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
            icon={<IconApps size={18} />}
            open={webMenuOpen}
            onClick={() => {
              setStaticMenuOpen(false);
              setWebMenuOpen(!webMenuOpen);
            }}
          >
            {webApps.map((app) => (
              <MenuItem
                key={app.id}
                active={sidebarRoute.appId === app.id}
                onClick={() => onSelectApp("web", app.id)}
              >
                {app.name}
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

          {/* Settings */}
          <MenuItem
            icon={<IconSettings size={18} />}
            active={sidebarRoute.isGlobalSettings}
            onClick={() => {
              setStaticMenuOpen(false);
              setWebMenuOpen(false);
              navigate("/settings");
            }}
          >
            Settings
          </MenuItem>
          <MenuItem
            icon={<IconLockBolt size={18} />}
            active={sidebarRoute.isWireguardSettings}
            onClick={() => {
              setStaticMenuOpen(false);
              setWebMenuOpen(false);
              navigate("/wireguard");
            }}
          >
            Wireguard
          </MenuItem>
        </Menu>

        {/* Footer */}
        <Box mt="auto" py="sm">
          <Divider mb="sm" />
          <Menu>
            <MenuItem
              icon={<IconLogout size={18} />}
              style={{ color: "var(--mantine-color-red-6)" }}
              onClick={() => {
                logoutMutation.mutate(undefined, {
                  onSuccess: () => {
                    navigate("/login");
                  }
                });
              }}
            >
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Sidebar>
      {/* Create Modal using CustomModal */}
      <CustomModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={modalFor === "static" ? "Create static site" : "Create web app"}
      >
        <Stack>
          <TextInput
            data-autofocus
            label="Name"
            placeholder="eg. marketing-site"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="sm">
            <Button onClick={saveItem}>Create</Button>
          </Group>
        </Stack>
      </CustomModal>
    </>
  );
}
