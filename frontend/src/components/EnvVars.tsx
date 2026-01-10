// src/components/EnvVarsTab.tsx
import { useState } from "react";
import {
  Button,
  Group,
  Paper,
  Table,
  Text,
  TextInput,
  Stack,
  Center
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconX,
  IconDatabaseOff
} from "@tabler/icons-react";
import {
  useCreateEnvVar,
  useDeleteEnvVar,
  useEnvVars,
  useUpdateEnvVar
} from "../apis/envVar";
import { CustomModal } from "./CustomModal";

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

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState("");

  const saveNewVar = () => {
    if (!newKey.trim()) return;
    create.mutate({ key: newKey.trim(), value: newValue });
    setNewKey("");
    setNewValue("");
    setAddOpen(false);
  };

  const confirmDelete = (id: string, key: string) => {
    setDeleteId(id);
    setDeleteKey(key);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) remove.mutate(deleteId);
    setDeleteId(null);
    setDeleteKey("");
    setDeleteOpen(false);
  };

  return (
    <Paper p="md" withBorder bg="gray.0">
      <Group justify="space-between" mb="sm">
        <Text fw={600}>Environment Variables</Text>
        <Button
          size="xs"
          leftIcon={<IconPlus size={14} />}
          onClick={() => setAddOpen(true)}
        >
          Add variable
        </Button>
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        Changes require redeploy to take effect
      </Text>

      {!isLoading && (!data || data.length === 0) ? (
        <Paper
          p="xl"
          radius="md"
          withBorder
          style={{ textAlign: "center", backgroundColor: "#f8f9fa" }}
        >
          <Center mb="sm">
            <IconDatabaseOff size={48} color="#9CA3AF" />
          </Center>
          <Text size="lg" fw={500} mb="xs">
            No environment variables
          </Text>
          <Text color="dimmed" size="sm" mb="md">
            You haven’t added any environment variables yet.
          </Text>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            Add Environment Variable
          </Button>
        </Paper>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Key</Table.Th>
              <Table.Th>Value</Table.Th>
              <Table.Th w={180}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={3}>Loading…</Table.Td>
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
                    <Group spacing="xs" noWrap>
                      {isEditing ? (
                        <>
                          <Button
                            size="xs"
                            color="green"
                            leftIcon={<IconCheck size={14} />}
                            onClick={() => {
                              update.mutate({ id: env.id, value: editingValue });
                              setEditingId(null);
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="xs"
                            color="gray"
                            leftIcon={<IconX size={14} />}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="xs"
                            leftIcon={<IconEdit size={14} />}
                            onClick={() => {
                              setEditingId(env.id);
                              setEditingValue(env.value);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            color="red"
                            leftIcon={<IconTrash size={14} />}
                            onClick={() => confirmDelete(env.id, env.key)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      {/* Add Environment Variable Modal */}
      <CustomModal  
        opened={addOpen}
        title="Add Environment Variable"
        onClose={() => setAddOpen(false)}
      >
        <Stack>
          <TextInput
          data-autofocus
            label="Key"
            placeholder="MY_VARIABLE"
            value={newKey}
            onChange={(e) => setNewKey(e.currentTarget.value)}
          />
          <TextInput
            label="Value"
            value={newValue}
            mt="sm"
            onChange={(e) => setNewValue(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button onClick={saveNewVar}>Add</Button>
          </Group>
        </Stack>
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <CustomModal 
        opened={deleteOpen}
        title="Delete Environment Variable"
        onClose={() => setDeleteOpen(false)}
      >
        <Stack>
          <Text>
            Are you sure you want to delete <b>{deleteKey}</b>?
          </Text>
          <Group justify="flex-end" mt="md">
            <Button color="gray" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </CustomModal>
    </Paper>
  );
}
