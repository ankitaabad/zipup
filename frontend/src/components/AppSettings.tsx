// src/components/AppSettings.tsx
import {
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Divider,
  Title,
  Badge,
  Box,
  UnstyledButton,
  Tooltip,
  TextInput,
  Kbd
} from "@mantine/core";
import {
  IconDownload,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconTrash
} from "@tabler/icons-react";
import { useState, useEffect, ReactNode } from "react";
import {
  useApp,
  useAppStatus,
  useDeleteApp,
  useRotateKeys,
  useStartApp,
  useStopApp,
  useUpdateApp
} from "../apis/apps";
import { CustomLoader } from "./CustomLoader";
import { CustomModal } from "./CustomModal";
import { useForm } from "@mantine/form";
import { AppCredentialsDialogBox } from "./AppCredentialsDialogBox";
import { theme } from "@frontend/theme";
import { useNavigate, useParams } from "react-router-dom";
import { AppStatus } from "@zipup/common";
import { AppStatusBadge } from "./AppStatusBadge";

/* ------------------- Types ------------------- */

type EditTarget =
  | "appName"
  | "domain"
  | "startCommand"
  | "appKey"
  | "deleteApp"
  | null;

/* ------------------- Component ------------------- */

function getStartTooltip(status: AppStatus) {
  switch (status) {
    case AppStatus.STOPPED:
      return "Start the app";
    case AppStatus.READY:
      return "No Artifact found. App is not deployable.";
    case AppStatus.RUNNING:
      return "App is already running";
    case AppStatus.DRAFT:
      return "Ensure start command is set and artifact is uploaded to start the app.";
  }
}
function getStopTooltip(status: AppStatus) {
  switch (status) {
    case AppStatus.RUNNING:
      return "Stop the app";
    default:
      return "App is not running";
  }
}
const handleDownload = (appId: string) => {
  window.open(`/api/apps/${appId}/config`);
};
export function AppSettings({ app_id }: { app_id: string }) {
  const appQuery = useApp(app_id);
  const updateApp = useUpdateApp(app_id);
  const rotateKeys = useRotateKeys(app_id);
  const deleteApp = useDeleteApp(app_id);
  const startApp = useStartApp(app_id);
  const stopApp = useStopApp(app_id);
  const appStatus = useAppStatus(app_id);
  const navigate = useNavigate();

  const { type } = useParams<{
    type: string;
    appId: string;
    tab?: string;
  }>();
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const appForm = useForm({
    initialValues: {
      app_name: "",
      domain: "",
      start_command: "",
      api_key_suffix: "",
      delete_app_name: ""
    }
  });

  /* ------------------- Sync persisted data ------------------- */
  useEffect(() => {
    if (appQuery.isSuccess && appQuery.data?.data) {
      const app = appQuery.data.data;
      appForm.setInitialValues({
        app_name: app.name || "",
        domain: app.domain || "",
        start_command: app.start_command || "",
        api_key_suffix: app.api_key_suffix || "",
        delete_app_name: ""
      });
      appForm.reset();
    }
  }, [appQuery.isSuccess, appQuery.data]);

  /* ------------------- Loading / Error ------------------- */
  if (appQuery.isLoading) {
    return <CustomLoader fullPage label="Loading app settings..." />;
  }

  if (appQuery.isError) {
    return <Text c="red">Failed to load app settings</Text>;
  }

  /* ------------------- Render ------------------- */
  return (
    <Paper withBorder p="lg" radius="md" bg="gray.0">
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <Title order={4}>App Settings</Title>
            <AppStatusBadge status={appStatus?.data! as AppStatus} />
          </Group>
          <Group>
            <Tooltip
              label="Download zipup.config.json file. (used for deployment)"
              withArrow
            >
              <Button
                variant="light"
                leftSection={<IconDownload size={16} />}
                onClick={() => handleDownload(app_id)}
              >
                Download Config
              </Button>
            </Tooltip>
            {!appStatus.isLoading && type === "web" && (
              <>
                <Tooltip label={getStartTooltip(appStatus.data!)} withArrow>
                  <Button
                    variant="light"
                    leftSection={<IconPlayerPlay size={16} />}
                    onClick={() => startApp.mutate()}
                    disabled={appStatus.data !== AppStatus.STOPPED}
                  >
                    Start
                  </Button>
                </Tooltip>
                <Tooltip label={getStopTooltip(appStatus.data!)} withArrow>
                  <Button
                    variant="light"
                    leftSection={<IconPlayerStop size={16} />}
                    onClick={() => stopApp.mutate()}
                    disabled={appStatus.data !== AppStatus.RUNNING}
                  >
                    Stop
                  </Button>
                </Tooltip>
              </>
            )}
            {/* <Button variant="outline" leftSection={<IconRefresh size={16} />}>
              Restart
            </Button> */}
            <Button
              color="red"
              variant="outline"
              leftSection={<IconTrash size={16} />}
              onClick={() => {
                setEditTarget("deleteApp");
              }}
            >
              Delete
            </Button>
          </Group>
        </Group>

        <Divider />

        {/* ------------------- App Name ------------------- */}
        <ConfigurableSettingRow
          label="App Name"
          value={appForm.getInitialValues().app_name}
          description="Used for app identification. You can also use this to filter your app logs"
          onClick={() => setEditTarget("appName")}
        />

        <Divider />

        {/* ------------------- Domain ------------------- */}
        <ConfigurableSettingRow
          label="Domain"
          value={appForm.getInitialValues().domain}
          description="Changing the domain updates the public URL of the App."
          onClick={() => setEditTarget("domain")}
        />

        <Divider />

        {/* ------------------- Start Command ------------------- */}
        {type === "web" && (
          <>
            <ConfigurableSettingRow
              label="Start Command"
              value={appForm.getInitialValues().start_command}
              description="This command is executed when artifact is deployed. like npm run start | node server.js"
              onClick={() => setEditTarget("startCommand")}
            />

            <Divider />
          </>
        )}
        {/* ------------------- API Key ------------------- */}
        <Box
          p="sm"
          style={{
            borderRadius: 8,
            transition: "background-color 120ms ease"
          }}
          className="config-row"
        >
          {/* Header */}
          <Group justify="space-between" align="center">
            <Tooltip
              label="Rotating the API key immediately invalidates the previous key."
              multiline
              w={240}
              withArrow
            >
              <Text size="sm" fw={500}>
                APP Key
              </Text>
            </Tooltip>

            {/* <Text size="xs" c="dimmed">
              Credentials
            </Text> */}
          </Group>

          {/* Value */}
          {appForm.getInitialValues().api_key_suffix ? (
            <Text
              size="sm"
              fw={500}
              mt={4}
              style={{ fontFamily: "var(--mantine-font-family-monospace)" }}
              c={theme.colors.primaryColor[7]}
            >
              •••• •••• •••• {appForm.getInitialValues().api_key_suffix}
            </Text>
          ) : (
            <Text size="sm" fw={500} c="red" mt={4}>
              Not set
            </Text>
          )}

          {/* Description */}
          <Text size="xs" c="dimmed" mt={6} maw={520}>
            [ Used with the zipup cli to deploy artifacts. ]
          </Text>

          {/* Actions */}
          <Group mt="sm">
            <Button
              size="xs"
              variant="light"
              onClick={() => setEditTarget("appKey")}
            >
              Get APP Keys
            </Button>
            <Button
              size="xs"
              color="orange"
              variant="outline"
              onClick={() => {
                rotateKeys.mutate();
              }}
            >
              Rotate Keys
            </Button>
          </Group>
        </Box>
        {/* ------------------- Modals ------------------- */}
        {editTarget === "appKey" && (
          <CustomModal
            opened
            title="App Credentials"
            onClose={() => setEditTarget(null)}
          >
            <AppCredentialsDialogBox
              appId={app_id}
              onClose={() => setEditTarget(null)}
            />
          </CustomModal>
        )}
        {editTarget === "deleteApp" && (
          <CustomModal
            opened
            title="Delete App"
            onClose={() => setEditTarget(null)}
          >
            {/* type the app name to delete the app */}
            <Text size="sm" c="dimmed" mb="sm">
              Type the app name to delete the app
            </Text>
            <TextInput
              data-autofocus
              style={{ width: "100%" }}
              {...appForm.getInputProps("delete_app_name")}
            />
            <Group justify="flex-end" mt="md">
              <Button
                onClick={() => {
                  deleteApp.mutate();
                  setEditTarget(null);
                  navigate("/");
                }}
                disabled={
                  appForm.values.delete_app_name !== appQuery?.data?.data?.name
                }
              >
                delete
              </Button>
            </Group>
          </CustomModal>
        )}
        {editTarget === "appName" && (
          <CustomModal
            opened
            title="Update App Name"
            onClose={() => {
              appForm.reset();
              setEditTarget(null);
            }}
          >
            <Text size="sm" c="dimmed" mb="sm">
              Used for app identification and for filtering logs of your app.
            </Text>

            <TextInput
              data-autofocus
              style={{ width: "100%" }}
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

        {editTarget === "domain" && (
          <CustomModal
            opened
            title="Update Domain"
            onClose={() => {
              appForm.reset();
              setEditTarget(null);
            }}
          >
            <Text size="sm" c="dimmed" mb="sm">
              This change updates the public URL of the App.
            </Text>

            <TextInput
              data-autofocus
              style={{ width: "100%" }}
              {...appForm.getInputProps("domain")}
            />

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

        {editTarget === "startCommand" && (
          <CustomModal
            opened
            title="Update Start Command"
            onClose={() => {
              appForm.reset();
              setEditTarget(null);
            }}
          >
            <Text size="sm" c="dimmed" mb="sm">
              This command is executed when artifact is deployed.
            </Text>

            <TextInput
              data-autofocus
              style={{ width: "100%" }}
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

/* ------------------- Configurable Row ------------------- */

function ConfigurableSettingRow({
  label,
  value,
  description,
  onClick
}: {
  label: string;
  value: string | null;
  description: string;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{ width: "100%", textAlign: "left" }}
    >
      <Box
        p="sm"
        style={{
          borderRadius: 8,
          transition: "background-color 120ms ease"
        }}
        className="config-row"
      >
        {/* Header */}
        <Group align="center">
          <Text size="sm" fw={500}>
            {label}
          </Text>

          <Text size="xs" c="dimmed">
            [ Click Row to Edit ]
          </Text>
        </Group>

        {/* Value */}
        {value ? (
          <Text
            size="sm"
            mt={4}
            fw={500}
            style={{ fontFamily: "monospace" }}
            c={theme.colors.primaryColor[7]}
          >
            {value}
          </Text>
        ) : (
          <Badge color="red" variant="light" mt={6}>
            Not set
          </Badge>
        )}

        {/* Description */}
        <Text size="xs" c="dimmed" mt={6} maw={520}>
          [ {description} ]
        </Text>
      </Box>
    </UnstyledButton>
  );
}
