import {
  Card,
  TextInput,
  Group,
  Button,
  ActionIcon,
  Table,
  Text,
  Stack,
  Badge,
  Divider,
  Box,
  Tabs
} from "@mantine/core";
import { useState } from "react";
import {
  IconTrash,
  IconPlus,
  IconPlayerPlay,
  IconPlayerStop,
  IconDeviceFloppy,
  IconRotateClockwise,
  IconTrashX
} from "@tabler/icons-react";
import { EnvVarsTab } from "../components/EnvVars";
import { AppSettings } from "../components/AppSettings";
import Deployment from "../components/Deployment";

export default function Dashboard() {
  const [name, setName] = useState("My Static App");
  const [path, setPath] = useState("/app-path");
  const [status, setStatus] = useState<"running" | "stopped">("running");
  const [activeTab, setActiveTab] = useState<string>("home");

  const [secrets, setSecrets] = useState<{ key: string; value: string }[]>([]);
  const [tempKey, setTempKey] = useState("");
  const [tempValue, setTempValue] = useState("");

  const addSecret = () => {
    if (!tempKey.trim()) return;
    setSecrets([...secrets, { key: tempKey, value: tempValue }]);
    setTempKey("");
    setTempValue("");
  };

  const deleteSecret = (index: number) =>
    setSecrets(secrets.filter((_, i) => i !== index));

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height:"100%"
        // cover full height
      }}
    >
      <Tabs
        // value={activeTab}
        onTabChange={(val) => setActiveTab(val || "env")}
        defaultValue="env"
        keepMounted
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <Tabs.List>
          <Tabs.Tab value="settings">App Settings</Tabs.Tab>
          <Tabs.Tab value="deployments">Deployments</Tabs.Tab>
          <Tabs.Tab value="env">Env Variables</Tabs.Tab>
          <Tabs.Tab value="secrets">Secrets</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel
          value="deployments"
          pt="md"
          style={{ flex: 1, overflowY: "auto" }}
        >
          <Deployment />
        </Tabs.Panel>
        <Tabs.Panel
          value="settings"
          pt="md"
          style={{ flex: 1, overflowY: "auto" }}
        >
          <AppSettings />
        </Tabs.Panel>
        <Tabs.Panel value="env" pt="md">
          <EnvVarsTab appId="test" />
        </Tabs.Panel>

        {/* --- SECRETS TAB --- */}
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
      </Tabs>
    </Card>
  );
}
