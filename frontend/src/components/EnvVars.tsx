import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Table,
  Text,
  TextInput
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconX
} from "@tabler/icons-react";
import { useState } from "react";
import {
  useCreateEnvVar,
  useDeleteEnvVar,
  useEnvVars,
  useUpdateEnvVar
} from "../apis/envVar";

export function EnvVarsTab({ appId }: { appId: string }) {
  const { data, isLoading } = useEnvVars(appId);
  const create = useCreateEnvVar(appId);
  const update = useUpdateEnvVar(appId);
  const remove = useDeleteEnvVar(appId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  return (
    <Paper p="md" withBorder bg={"gray.0"}>
      <Group justify="space-between" mb="sm">
        <Text fw={600}>Environment Variables</Text>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() => setAddOpen(true)}
        >
          Add variable
        </Button>
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        Changes require redeploy to take effect
      </Text>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Key</Table.Th>
            <Table.Th>Value</Table.Th>
            <Table.Th w={120}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {isLoading && (
            <Table.Tr>
              <Table.Td colSpan={3}>Loading…</Table.Td>
            </Table.Tr>
          )}

          {!isLoading && data?.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={3}>
                <Text c="dimmed">No environment variables</Text>
              </Table.Td>
            </Table.Tr>
          )}

          {data?.map((env) => {
            const isEditing = editingId === env.id;

            return (
              <Table.Tr key={env.id}>
                <Table.Td>
                  <Text fw={500}>{env.key}</Text>
                </Table.Td>

                <Table.Td>
                  {isEditing ? (
                    <TextInput
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.currentTarget.value)}
                      size="xs"
                    />
                  ) : (
                    <Text>{env.value}</Text>
                  )}
                </Table.Td>

                <Table.Td>
                  <Group gap={4}>
                    {isEditing ? (
                      <>
                        <ActionIcon
                          color="green"
                          size="sm"
                          onClick={() => {
                            update.mutate({
                              id: env.id,
                              value: editingValue
                            });
                            setEditingId(null);
                          }}
                        >
                          <IconCheck size={14} />
                        </ActionIcon>
                        <ActionIcon
                          color="gray"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </>
                    ) : (
                      <>
                        <ActionIcon
                          size="sm"
                          onClick={() => {
                            setEditingId(env.id);
                            setEditingValue(env.value);
                          }}
                        >
                          <IconEdit size={14} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          size="sm"
                          onClick={() => remove.mutate(env.id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      {/* Add modal */}
      <Modal
        opened={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add environment variable"
      >
        <TextInput
          label="Key"
          placeholder="MY_VARIABLE"
          value={newKey}
          onChange={(e) => setNewKey(e.currentTarget.value)}
        />
        <TextInput
          label="Value"
          mt="sm"
          value={newValue}
          onChange={(e) => setNewValue(e.currentTarget.value)}
        />
        <Group justify="flex-end" mt="md">
          <Button
            onClick={() => {
              create.mutate({ key: newKey, value: newValue });
              setNewKey("");
              setNewValue("");
              setAddOpen(false);
            }}
          >
            Add
          </Button>
        </Group>
      </Modal>
    </Paper>
  );
}
