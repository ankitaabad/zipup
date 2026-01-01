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
  Text
} from "@mantine/core";
import { useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useApp } from "../apis/apps";
import { AppSettings } from "../components/AppSettings";
import Deployment from "../components/Deployment";
import { EnvVarsTab } from "../components/EnvVars";
import { Loader } from "../components/Loader";

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

  if (appQuery.isLoading) {
    return <Loader label="Loading app..." />;
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
        <Title order={3}>{app.name}</Title>

        <Tabs
          // value={activeTab}
          // defaultValue={"settings"}
          value={tab}
          onChange={handleTabChange}
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          <Tabs.List>
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
            <Tabs.Tab value="deployments">Deployments</Tabs.Tab>
            <Tabs.Tab value="env">Env Variables</Tabs.Tab>
            <Tabs.Tab value="secrets">Secrets</Tabs.Tab>
          </Tabs.List>

          {/* Overview */}
          <Tabs.Panel
            value="overview"
            pt="md"
            style={{ flex: 1, overflowY: "auto" }}
          >
            <div>
              <p>App type: {type}</p>
              <p>Internal port: {app.internal_port}</p>
              {/* Add more overview info here */}
            </div>
          </Tabs.Panel>

          {/* App Settings */}
          <Tabs.Panel
            value="settings"
            pt="md"
            style={{ flex: 1, overflowY: "auto" }}
          >
            <AppSettings app_id={appId!} />
          </Tabs.Panel>

          {/* Deployments */}
          <Tabs.Panel
            value="deployments"
            pt="md"
            style={{ flex: 1, overflowY: "auto" }}
          >
            <Deployment />
          </Tabs.Panel>

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
            <Stack gap="lg">
              <Divider label="Secrets" labelPosition="left" />
              <Table striped highlightOnHover withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Key</Table.Th>
                    <Table.Th>Value</Table.Th>
                    <Table.Th style={{ width: 60 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <TextInput
                        placeholder="SECRET_KEY"
                        value={tempKey}
                        onChange={(e) => setTempKey(e.currentTarget.value)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        placeholder="SECRET_VALUE"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.currentTarget.value)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="blue"
                        variant="light"
                        onClick={addSecret}
                        disabled={!tempKey.trim()}
                      >
                        <IconPlus size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>

                  {secrets.map((s, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>{s.key}</Table.Td>
                      <Table.Td>{s.value}</Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => deleteSecret(index)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Tabs.Panel>

          {/* Logs */}
          <Tabs.Panel
            value="logs"
            pt="md"
            style={{ flex: 1, overflow: "hidden" }}
          >
            <iframe
              src={`http://localhost:9428/select/vmui/${appId}`} // VMUI logs for this app
              style={{ width: "100%", height: "100%", border: "none" }}
              title="VictoriaLogs"
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Paper>
  );
}
