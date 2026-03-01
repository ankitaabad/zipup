// src/pages/AppLayout.tsx
import { useParams, useNavigate } from "react-router-dom";
import {
  Paper,
  Tabs,
  Stack,
  Title,
  Table,
  TextInput,
  ActionIcon,
  Divider,
  Text,
  Group
} from "@mantine/core";
import { useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useApp, useAppStatus } from "../apis/apps";
import { AppSettings } from "../components/AppSettings";
import Deployment from "../components/Deployment";
import { EnvVarsTab } from "../components/EnvVars";
import { CustomLoader } from "../components/CustomLoader";
import { theme } from "@frontend/theme";
import { SecretVarsTab } from "@frontend/components/SecretVarsTab";
import { AppStatusBadge } from "@frontend/components/AppStatusBadge";
import { AppStatus } from "@common/index";

export default function AppLayout() {
  const { type, appId, tab } = useParams<{
    type: string;
    appId: string;
    tab?: string;
  }>();
  console.log({ tab });
  const navigate = useNavigate();

  const appQuery = useApp(appId!);

  const [secrets, setSecrets] = useState<{ key: string; value: string }[]>([]);
  const [tempKey, setTempKey] = useState("");
  const [tempValue, setTempValue] = useState("");
  const appStatus = useAppStatus(appId!);
  if (appQuery.isLoading) {
    return <CustomLoader label="Loading app..." />;
  }

  if (appQuery.isError) {
    return <div>Error loading app</div>;
  }

  const app = appQuery.data.data;

  const tabsList = ["settings", "deployments", "env", "secrets"];
  const activeTab = tab || "settings";

  const handleTabChange = (newTab: string) => {
    console.log({ newTab });
    navigate(`/apps/${type}/${appId}/${newTab}`);
  };

  const addSecret = () => {
    if (!tempKey.trim()) return;
    setSecrets([...secrets, { key: tempKey, value: tempValue }]);
    setTempKey("");
    setTempValue("");
  };

  const deleteSecret = (index: number) =>
    setSecrets(secrets.filter((_, i) => i !== index));

  return (
    <Paper
      p="md"
      radius="md"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "80vh"
      }}
    >
      <Stack style={{ flex: 1 }}>
        {/* <Group align="center" gap="sm">
          <Title
            order={3}
            fw={600}
            style={{
              letterSpacing: "-0.3px"
            }}
          >
            {app.name}
          </Title>

          <AppStatusBadge status={appStatus?.data! as AppStatus} />
        </Group> */}

        <Tabs
          // value={activeTab}
          // defaultValue={"settings"}
          value={tab}
          onChange={handleTabChange}
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          <Tabs.List>
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
            {/* <Tabs.Tab value="deployments">Deployments</Tabs.Tab> */}
            {type === "web" && (
              <>
                <Tabs.Tab value="env">Env Variables</Tabs.Tab>
                <Tabs.Tab value="secrets">Secrets</Tabs.Tab>
              </>
            )}
          </Tabs.List>

          {/* App Settings */}
          <Tabs.Panel
            value="settings"
            pt="md"
            style={{ flex: 1, overflowY: "auto" }}
          >
            <AppSettings app_id={appId!} />
          </Tabs.Panel>

          {/* Deployments */}
          {/* <Tabs.Panel
            value="deployments"
            pt="md"
            style={{ flex: 1, overflowY: "auto" }}
          >
            <Deployment />
          </Tabs.Panel> */}

          {/* Env Variables */}

          <Tabs.Panel
            value="env"
            pt="md"
            style={{ flex: 1, overflowY: "auto" }}
          >
            <EnvVarsTab appId={appId!} />
          </Tabs.Panel>

          {/* Secrets */}
          <Tabs.Panel
            value="secrets"
            pt="md"
            style={{ flex: 1, overflowY: "auto" }}
          >
            <SecretVarsTab appId={appId!} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Paper>
  );
}
