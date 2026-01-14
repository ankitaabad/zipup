import {
  Stack,
  Text,
  Group,
  TextInput,
  ActionIcon,
  Tooltip,
  Button,
  useMantineTheme
} from "@mantine/core";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { useClipboard } from "@mantine/hooks";
import { useAppAppKey } from "@frontend/apis/apps";

interface AppCredentialsDialogBoxProps {
  appId: string;
  onClose: () => void;
}

export function AppCredentialsDialogBox({
  appId,
  onClose
}: AppCredentialsDialogBoxProps) {
  const theme = useMantineTheme();

  // separate clipboard states
  const appKeyClipboard = useClipboard({ timeout: 1500 });
  const secretKeyClipboard = useClipboard({ timeout: 1500 });

  const { data, isLoading, isError } = useAppAppKey(appId);

  if (isLoading) {
    return (
      <Text size="sm" c="dimmed">
        Loading app credentials…
      </Text>
    );
  }

  if (isError || !data) {
    return (
      <Text size="sm" c="red.6">
        Failed to load app credentials. Please try again.
      </Text>
    );
  }

  const { app_key, secret_key } = data;

  const inputStyles = {
    input: {
      fontFamily: "monospace",
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[6]
          : theme.colors.gray[0]
    }
  };

  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        These credentials are used to authenticate requests made by this
        application. Keep them secure and do not share publicly.
      </Text>

      {/* App Key */}
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          App Key
        </Text>

        <Group gap="xs">
          <TextInput
            value={app_key}
            readOnly
            type="password"
            styles={inputStyles}
            style={{ flex: 1 }}
          />

          <Tooltip label={appKeyClipboard.copied ? "Copied" : "Copy"} withArrow>
            <ActionIcon
              variant="light"
              onClick={() => appKeyClipboard.copy(app_key)}
            >
              {appKeyClipboard.copied ? (
                <IconCheck size={16} />
              ) : (
                <IconCopy size={16} />
              )}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Stack>

      {/* Secret Key */}
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Secret Key
        </Text>

        <Group gap="xs">
          <TextInput
            value={secret_key}
            readOnly
            type="password"
            styles={inputStyles}
            style={{ flex: 1 }}
          />

          <Tooltip
            label={secretKeyClipboard.copied ? "Copied" : "Copy"}
            withArrow
          >
            <ActionIcon
              variant="light"
              onClick={() => secretKeyClipboard.copy(secret_key)}
            >
              {secretKeyClipboard.copied ? (
                <IconCheck size={16} />
              ) : (
                <IconCopy size={16} />
              )}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Stack>

      {/* Footer */}
      <Group justify="flex-end" mt="md">
        <Button onClick={onClose}>Close</Button>
      </Group>
    </Stack>
  );
}
