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
  Tabs,
} from "@mantine/core";
import { useState } from "react";
import {
  IconTrash,
  IconPlus,
  IconPlayerPlay,
  IconPlayerStop,
  IconDeviceFloppy,
  IconRotateClockwise,
  IconTrashX,
} from "@tabler/icons-react";

export function StaticApp() {
  const [name, setName] = useState("My Static App");
  const [path, setPath] = useState("/app-path");
  const [status, setStatus] = useState<"running" | "stopped">("running");

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
      style={{ width: "100%", position: "relative" }}
    >
      <Tabs defaultValue="home" keepMounted>
        <Tabs.List>
          <Tabs.Tab value="home">Home</Tabs.Tab>
          <Tabs.Tab value="secrets">Secrets</Tabs.Tab>
        </Tabs.List>

        {/* --- HOME TAB --- */}
        <Tabs.Panel value="home" pt="md">
          <Stack gap="lg">
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group grow wrap="nowrap" align="flex-end" gap="md">
                {/* STATUS */}
                <Box w={60}>
                  <Text fw={500} size="sm">
                    Status
                  </Text>
                  <Badge
                    fullWidth
                    color={status === "running" ? "green" : "red"}
                    size="md"
                    radius="sm"
                    style={{
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {status === "running" ? "Running" : "Stopped"}
                  </Badge>
                </Box>

                {/* NAME */}
                <TextInput
                  label="App Name"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                />

                {/* PATH */}
                <TextInput
                  label="Domain Path"
                  value={path}
                  onChange={(e) => setPath(e.currentTarget.value)}
                />

                {/* SAVE BUTTON */}
                <Button
                  w={60}
                  size="sm"
                  variant="filled"
                  color="blue"
                  leftSection={<IconDeviceFloppy size={14} />}
                  style={{ height: 36 }}
                >
                  Save
                </Button>
              </Group>
            </Group>
          </Stack>
        </Tabs.Panel>

        {/* --- SECRETS TAB --- */}
        <Tabs.Panel value="secrets" pt="md">
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
                {/* row for adding secret */}
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

                {/* existing secrets */}
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

      {/* --- STICKY BOTTOM BUTTON GROUP --- */}
      <Box
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Button.Group>
          <Button
            variant="filled"
            color="green"
            leftSection={<IconPlayerPlay size={14} />}
            onClick={() => setStatus("running")}
          >
            Start
          </Button>

          <Button
            variant="filled"
            color="yellow"
            leftSection={<IconPlayerStop size={14} />}
            onClick={() => setStatus("stopped")}
          >
            Stop
          </Button>

          <Button
            variant="filled"
            color="blue"
            leftSection={<IconRotateClockwise size={14} />}
          >
            Restart
          </Button>

          <Button
            variant="filled"
            color="orange"
            leftSection={<IconTrashX size={14} />}
          >
            Clear Cache
          </Button>

          <Button
            variant="filled"
            color="red"
            leftSection={<IconTrash size={14} />}
          >
            Delete
          </Button>
        </Button.Group>
      </Box>
    </Card>
  );
}
