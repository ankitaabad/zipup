// src/components/AppSettings.tsx
import {
  Paper,
  Stack,
  Group,
  Text,
  ActionIcon,
  TextInput,
  Button,
  Divider,
  Title,
  Menu,
  Badge,
  Box,
  useMantineTheme
} from "@mantine/core";
import {
  IconPencil,
  IconDotsVertical,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconTrash,
  IconX
} from "@tabler/icons-react";
import { useState, useEffect, ReactNode } from "react";
import { useApp, useUpdateApp } from "../apis/apps";
import { Loader } from "./Loader";
import { CustomModal } from "./CustomModal";

/* ------------------- Custom Modal Component ------------------- */
interface CustomModalProps {
  opened: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  padding?: string | number;
}



/* ------------------- AppSettings Component ------------------- */

type EditTarget =
  | "appName"
  | "domainPath"
  | "redisPrefix"
  | "startCommand"
  | null;

export function AppSettings({ app_id }: { app_id: string }) {
  const appQuery = useApp(app_id);
  const updateApp = useUpdateApp(app_id);

  // ------------------- State -------------------
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [redisPrefix, setRedisPrefix] = useState<string | null>(null);
  const [startCommand, setStartCommand] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // ------------------- Sync data when loaded -------------------
  useEffect(() => {
    if (appQuery.isSuccess && appQuery.data?.data) {
      const app = appQuery.data.data;
      setAppName(app.name || null);
      setDomain(app.domain || null);
      setPath(app.path || null);
      setStartCommand(app.start_command || null);
      setRedisPrefix(app.redis_prefix || null);
      setApiKey(app.api_key_suffix || null);
    }
  }, [appQuery.isSuccess, appQuery.data]);

  // ------------------- Loading / Error -------------------
  if (appQuery.isLoading) return <Loader fullPage label="Loading app settings..." />;
  if (appQuery.isError) return <Text color="red">Failed to load app settings</Text>;

  // ------------------- Render -------------------
  return (
    <Paper withBorder p="lg" radius="md" bg="gray.0">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={4}>App Settings</Title>

          <Menu position="bottom-end">
            <Menu.Target>
              <Button variant="outline">Actions</Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPlayerPlay size={16} />}>Start</Menu.Item>
              <Menu.Item leftSection={<IconPlayerStop size={16} />}>Stop</Menu.Item>
              <Menu.Item leftSection={<IconRefresh size={16} />}>Restart</Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={16} />}>Delete App</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Divider />

        {/* Settings rows */}
        <SettingRow label="App Name" value={appName} onEdit={() => setEditTarget("appName")} />
        <Divider />
        <SettingRow
          label="Domain"
          value={domain && path ? `${domain}${path}` : null}
          onEdit={() => setEditTarget("domainPath")}
        />
        <Divider />
        <SettingRow label="Redis Prefix" value={redisPrefix} onEdit={() => setEditTarget("redisPrefix")} />
        <Divider />
        <SettingRow label="Start Command" value={startCommand} onEdit={() => setEditTarget("startCommand")} />
        <Divider />

        {/* API Key */}
        <Group align="flex-start" gap="sm">
          <Menu position="bottom-start">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" mt={2} aria-label="API key actions">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item>Get API Key</Menu.Item>
              <Menu.Item color="orange">Rotate API Key</Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <div style={{ flex: 1 }}>
            <Text size="sm" fw={500}>API Key</Text>
            {apiKey ? (
              <Text size="sm" c="dimmed">•••• •••• •••• {apiKey.slice(-4)}</Text>
            ) : (
              <Badge color="red" variant="light">Not set</Badge>
            )}
          </div>
        </Group>

        {/* ------------------- Modals ------------------- */}
        {editTarget === "appName" && (
          <CustomModal title="Update App Name" opened onClose={() => setEditTarget(null)}>
            <TextInput
              label="App Name"
              description="Shown in dashboards and logs"
              value={appName || ""}
              onChange={(e) => setAppName(e.currentTarget.value)}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={() => setEditTarget(null)}>Save</Button>
            </Group>
          </CustomModal>
        )}

        {editTarget === "domainPath" && (
          <CustomModal title="Update Domain & Path" opened onClose={() => setEditTarget(null)}>
            <TextInput
              label="Domain"
              value={domain || ""}
              onChange={(e) => setDomain(e.currentTarget.value)}
            />
            <TextInput
              label="Path"
              value={path || ""}
              onChange={(e) => setPath(e.currentTarget.value)}
            />
            <Text size="xs" c="dimmed">This will change the public URL of your application.</Text>
            <Group justify="flex-end" mt="md">
              <Button onClick={() => setEditTarget(null)}>Save</Button>
            </Group>
          </CustomModal>
        )}

        {editTarget === "redisPrefix" && (
          <CustomModal title="Update Redis Prefix" opened onClose={() => setEditTarget(null)}>
            <TextInput
              label="Redis Prefix"
              description="Changing this may invalidate existing cache keys"
              value={redisPrefix || ""}
              onChange={(e) => setRedisPrefix(e.currentTarget.value)}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={() => setEditTarget(null)}>Save</Button>
            </Group>
          </CustomModal>
        )}

        {editTarget === "startCommand" && (
          <CustomModal title="Update Start Command" opened onClose={() => setEditTarget(null)}>
            <TextInput
              label="Start Command"
              description="Executed when the app container starts"
              value={startCommand || ""}
              onChange={(e) => setStartCommand(e.currentTarget.value)}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={() => setEditTarget(null)}>Save</Button>
            </Group>
          </CustomModal>
        )}
      </Stack>
    </Paper>
  );
}

/* ------------------- Setting Row Component ------------------- */
function SettingRow({ label, value, onEdit }: { label: string; value: string | null; onEdit: () => void }) {
  return (
    <Group align="flex-start" gap="sm">
      <ActionIcon variant="subtle" color="gray" mt={2} onClick={onEdit} aria-label={`Edit ${label}`}>
        <IconPencil size={16} />
      </ActionIcon>
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500}>{label}</Text>
        {value ? (
          <Text size="sm" c="dimmed">{value}</Text>
        ) : (
          <Badge color="red" variant="light">Not set</Badge>
        )}
      </div>
    </Group>
  );
}
