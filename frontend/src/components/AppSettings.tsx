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
import { CustomLoader } from "./CustomLoader";
import { CustomModal } from "./CustomModal";
import { useForm } from "@mantine/form";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { AppCredentialsDialogBox } from "./AppCredentialsDialogBox";

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
  | "appKey"
  | null;

export function AppSettings({ app_id }: { app_id: string }) {
  const appQuery = useApp(app_id);
  const updateApp = useUpdateApp(app_id);

  // ------------------- State -------------------
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const appForm = useForm({
    initialValues: {
      domain: "",
      redis_prefix: "",
      start_command: "",
      api_key_suffix: "",
      app_name: ""
    }
    // validate: zod4Resolver(appFormSchema)
  });
  // ------------------- Sync data when loaded -------------------
  useEffect(() => {
    if (appQuery.isSuccess && appQuery.data?.data) {
      const app = appQuery.data.data;
      appForm.setInitialValues({
        app_name: app.name || "",
        domain: app.domain || "",
        start_command: app.start_command || "",
        redis_prefix: app.redis_prefix || "",
        api_key_suffix: app.api_key_suffix || ""
      });
      appForm.reset();
    }
  }, [appQuery.isSuccess, appQuery.data]);

  // ------------------- Loading / Error -------------------
  if (appQuery.isLoading)
    return <CustomLoader fullPage label="Loading app settings..." />;
  if (appQuery.isError)
    return <Text color="red">Failed to load app settings</Text>;

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
              <Menu.Item leftSection={<IconPlayerPlay size={16} />}>
                Start
              </Menu.Item>
              <Menu.Item leftSection={<IconPlayerStop size={16} />}>
                Stop
              </Menu.Item>
              <Menu.Item leftSection={<IconRefresh size={16} />}>
                Restart
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={16} />}>
                Delete App
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Divider />

        {/* Settings rows */}
        <SettingRow
          label="App Name"
          value={appForm.getInitialValues().app_name}
          onEdit={() => setEditTarget("appName")}
        />
        <Divider />
        <SettingRow
          label="Domain"
          value={appForm.getInitialValues().domain}
          onEdit={() => setEditTarget("domainPath")}
        />
        <Divider />
        <SettingRow
          label="Redis Prefix"
          value={appForm.getInitialValues().redis_prefix}
          onEdit={() => setEditTarget("redisPrefix")}
        />
        <Divider />
        <SettingRow
          label="Start Command"
          value={appForm.getInitialValues().start_command}
          onEdit={() => setEditTarget("startCommand")}
        />
        <Divider />

        {/* API Key */}
        <Group align="flex-start" gap="sm">
          <Menu position="bottom-start">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                mt={2}
                aria-label="API key actions"
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                onClick={() => {
                  setEditTarget("appKey");
                }}
              >
                Get API Key
              </Menu.Item>
              <Menu.Item color="orange">Rotate API Key</Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <div style={{ flex: 1 }}>
            <Text size="sm" fw={500}>
              API Key
            </Text>
            {appForm.getInitialValues().api_key_suffix ? (
              <Text size="sm" c="dimmed">
                .... .... .... {appForm.getInitialValues().api_key_suffix}
              </Text>
            ) : (
              <Badge color="red" variant="light">
                Not set
              </Badge>
            )}
          </div>
        </Group>

        {/* ------------------- Modals ------------------- */}
        {editTarget === "appKey" && (
          <CustomModal
            opened
            onClose={() => {
              setEditTarget(null);
            }}
            title="App Credentials"
          >
            <AppCredentialsDialogBox
              onClose={() => {
                setEditTarget(null);
              }}
              appId={app_id}
            />
          </CustomModal>
        )}
        {editTarget === "appName" && (
          <CustomModal
            title="Update App Name"
            opened
            onClose={() => {
              appForm.reset();
              setEditTarget(null);
            }}
          >
            <TextInput
              data-autofocus
              label="App Name"
              description="Shown in dashboards and logs"
              key={appForm.key("app_name")}
              {...appForm.getInputProps("app_name")}
            />
            <Group justify="flex-end" mt="md">
              <Button
                onClick={() => {
                  updateApp.mutate({
                    action: "UpdateAppName",
                    name: appForm.values.app_name
                  });
                  setEditTarget(null);
                }}
              >
                Save
              </Button>
            </Group>
          </CustomModal>
        )}

        {editTarget === "domainPath" && (
          <CustomModal
            title="Update Domain"
            opened
            onClose={() => {
              appForm.reset();
              setEditTarget(null);
            }}
          >
            <TextInput
              data-autofocus
              label="Domain"
              key={appForm.key("domain")}
              {...appForm.getInputProps("domain")}
            />

            <Text size="xs" c="dimmed" mt={5}>
              This will change the public URL of your application.
            </Text>
            <Group justify="flex-end" mt="md">
              <Button
                onClick={() => {
                  updateApp.mutate({
                    action: "UpdateDomain",
                    domain: appForm.values.domain
                  });
                  setEditTarget(null);
                }}
              >
                Save
              </Button>
            </Group>
          </CustomModal>
        )}

        {editTarget === "redisPrefix" && (
          <CustomModal
            title="Update Redis Prefix"
            opened
            onClose={() => {
              appForm.reset();
              setEditTarget(null);
            }}
          >
            <TextInput
              data-autofocus
              label="Redis Prefix"
              description="Changing this may invalidate existing cache keys"
              key={appForm.key("redis_prefix")}
              {...appForm.getInputProps("redis_prefix")}
            />
            <Group justify="flex-end" mt="md">
              <Button
                onClick={() => {
                  updateApp.mutate({
                    action: "UpdateRedisPrefix",
                    redis_prefix: appForm.values.redis_prefix
                  });
                  setEditTarget(null);
                }}
              >
                Save
              </Button>
            </Group>
          </CustomModal>
        )}

        {editTarget === "startCommand" && (
          <CustomModal
            title="Update Start Command"
            opened
            onClose={() => {
              appForm.reset();
              setEditTarget(null);
            }}
          >
            <TextInput
              data-autofocus
              label="Start Command"
              description="Executed when the app container starts"
              key={appForm.key("start_command")}
              {...appForm.getInputProps("start_command")}
            />
            <Group justify="flex-end" mt="md">
              <Button
                onClick={() => {
                  updateApp.mutate({
                    action: "UpdateStartCommand",
                    start_command: appForm.values.start_command
                  });
                  setEditTarget(null);
                }}
              >
                Save
              </Button>
            </Group>
          </CustomModal>
        )}
      </Stack>
    </Paper>
  );
}

/* ------------------- Setting Row Component ------------------- */
function SettingRow({
  label,
  value,
  onEdit
}: {
  label: string;
  value: string | null;
  onEdit: () => void;
}) {
  return (
    <Group align="flex-start" gap="sm">
      <ActionIcon
        variant="subtle"
        color="gray"
        mt={2}
        onClick={onEdit}
        aria-label={`Edit ${label}`}
      >
        <IconPencil size={16} />
      </ActionIcon>
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {value ? (
          <Text size="sm" c="dimmed">
            {value}
          </Text>
        ) : (
          <Badge color="red" variant="light">
            Not set
          </Badge>
        )}
      </div>
    </Group>
  );
}
