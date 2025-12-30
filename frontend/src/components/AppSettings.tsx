import {
  Paper,
  Stack,
  Group,
  Text,
  ActionIcon,
  Modal,
  TextInput,
  Button,
  Divider,
  Title,
  Menu
} from "@mantine/core";
import {
  IconPencil,
  IconDotsVertical,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconTrash
} from "@tabler/icons-react";
import { useState } from "react";

type EditTarget =
  | "appName"
  | "domainPath"
  | "redisPrefix"
  | "startCommand"
  | null;

export function AppSettings() {
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  // Mock data
  const [appName, setAppName] = useState("my-service");
  const [domain, setDomain] = useState("example.com");
  const [path, setPath] = useState("/api");
  const [redisPrefix, setRedisPrefix] = useState("app:prod");
  const [startCommand, setStartCommand] = useState("npm run start");
  const [apiKey] = useState("abcd-1234-efgh-5678");

  return (
    <Paper withBorder p="lg" radius="md" bg={"gray.0"}>
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

        <SettingRow
          label="App Name"
          value={appName}
          onEdit={() => setEditTarget("appName")}
        />

        <Divider />

        <SettingRow
          label="Domain"
          value={`${domain}${path}`}
          onEdit={() => setEditTarget("domainPath")}
        />

        <Divider />

        <SettingRow
          label="Redis Prefix"
          value={redisPrefix}
          onEdit={() => setEditTarget("redisPrefix")}
        />

        <Divider />

        <SettingRow
          label="Start Command"
          value={startCommand}
          onEdit={() => setEditTarget("startCommand")}
        />

        <Divider />

        {/* API Key (menu justified) */}
        <Group justify="space-between">
          <div>
            <Text size="sm" fw={500}>
              API Key
            </Text>
            <Text size="sm" c="dimmed">
              •••• •••• •••• {apiKey.slice(-4)}
            </Text>
          </div>

          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item>Get API Key</Menu.Item>
              <Menu.Item color="orange">Rotate API Key</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Modals */}
        <EditModal
          opened={editTarget === "appName"}
          title="Update App Name"
          label="App Name"
          value={appName}
          description="Shown in dashboards and logs"
          onClose={() => setEditTarget(null)}
          onSave={(v) => {
            setAppName(v);
            setEditTarget(null);
          }}
        />

        <DomainPathModal
          opened={editTarget === "domainPath"}
          domain={domain}
          path={path}
          onClose={() => setEditTarget(null)}
          onSave={(d, p) => {
            setDomain(d);
            setPath(p);
            setEditTarget(null);
          }}
        />

        <EditModal
          opened={editTarget === "redisPrefix"}
          title="Update Redis Prefix"
          label="Redis Prefix"
          value={redisPrefix}
          description="Changing this may invalidate existing cache keys"
          onClose={() => setEditTarget(null)}
          onSave={(v) => {
            setRedisPrefix(v);
            setEditTarget(null);
          }}
        />

        <EditModal
          opened={editTarget === "startCommand"}
          title="Update Start Command"
          label="Start Command"
          value={startCommand}
          description="Executed when the app container starts"
          onClose={() => setEditTarget(null)}
          onSave={(v) => {
            setStartCommand(v);
            setEditTarget(null);
          }}
        />
      </Stack>
    </Paper>
  );
}

/* ---------------------------- Components ---------------------------- */

function SettingRow({
  label,
  value,
  onEdit
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <Group justify="space-between">
      <div>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        <Text size="sm" c="dimmed">
          {value}
        </Text>
      </div>

      <ActionIcon variant="subtle" onClick={onEdit}>
        <IconPencil size={16} />
      </ActionIcon>
    </Group>
  );
}

function EditModal({
  opened,
  title,
  label,
  value,
  description,
  onClose,
  onSave
}: {
  opened: boolean;
  title: string;
  label: string;
  value: string;
  description?: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [v, setV] = useState(value);

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack>
        <TextInput
          label={label}
          description={description}
          value={v}
          onChange={(e) => setV(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button onClick={() => onSave(v)}>Save</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function DomainPathModal({
  opened,
  domain,
  path,
  onClose,
  onSave
}: {
  opened: boolean;
  domain: string;
  path: string;
  onClose: () => void;
  onSave: (domain: string, path: string) => void;
}) {
  const [d, setD] = useState(domain);
  const [p, setP] = useState(path);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Update Domain & Path"
      centered
    >
      <Stack>
        <TextInput
          label="Domain"
          value={d}
          onChange={(e) => setD(e.currentTarget.value)}
        />
        <TextInput
          label="Path"
          value={p}
          onChange={(e) => setP(e.currentTarget.value)}
        />

        <Text size="xs" c="dimmed">
          This will change the public URL of your application.
        </Text>

        <Group justify="flex-end">
          <Button onClick={() => onSave(d, p)}>Save</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
