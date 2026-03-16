// src/components/SecretVarsTab.tsx
import { useState } from "react";
import {
  Button,
  Group,
  Paper,
  Table,
  Text,
  Stack,
  Center,
  PasswordInput,
  TextInput
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconX,
  IconDatabaseOff,
  IconLock,
  IconScooterElectric,
  IconLockCog,
  IconLockPassword
} from "@tabler/icons-react";
import {
  useGetAllSecretVarsKeys,
  useCreateSecretVar,
  useDeleteSecretVar,
  useUpdateSecretVar,
  useFetchSecretVar
} from "../apis/secretVars";
import { CustomModal } from "./CustomModal";

export function SecretVarsTab({ appId }: { appId: string }) {
  const { data, isLoading } = useGetAllSecretVarsKeys(appId);

  const create = useCreateSecretVar(appId);
  const update = useUpdateSecretVar(appId);
  const remove = useDeleteSecretVar(appId);
  const fetchSecret = useFetchSecretVar(appId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState("");

  /* ---------- handlers ---------- */

  const openEdit = async (id: string, key: string, description: string) => {
    setEditingId(id);
    setEditingKey(key);
    setEditingDescription(description);

    const res = await fetchSecret.mutateAsync(id);
    setEditingValue(res.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingKey("");
    setEditingDescription("");
    setEditingValue("");
  };

  const saveEdit = () => {
    if (!editingId) return;

    update.mutate({
      secret_id: editingId,
      value: editingValue,
      description: editingDescription
    });

    cancelEdit();
  };

  const saveNewSecret = () => {
    if (!newKey.trim()) return;

    create.mutate({
      key: newKey.trim(),
      value: newValue,
      description: newDescription
    });

    setNewKey("");
    setNewValue("");
    setNewDescription("");
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

  /* ---------- UI ---------- */

  return (
    <Paper p="md" withBorder bg="gray.0">
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          {/* <IconLock size={16} /> */}
          <Text fw={600}>Secrets</Text>
        </Group>

        <Button
          size="xs"
          leftIcon={<IconPlus size={14} />}
          onClick={() => setAddOpen(true)}
        >
          Add Secret Variable
        </Button>
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        Secret values are hidden and fetched only when edited.
      </Text>

      {!isLoading && (!data || data.length === 0) ? (
        <Paper
          p="xl"
          radius="md"
          withBorder
          style={{ textAlign: "center", backgroundColor: "#f8f9fa" }}
        >
          <Center mb="sm">
            <IconLockPassword size={48} color="#9CA3AF" />
          </Center>
          <Text size="lg" fw={500} mb="xs">
            No secret variables
          </Text>
          <Text color="dimmed" size="sm" mb="md">
            You haven’t added any secret variables yet.
          </Text>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            Add Secret Variable
          </Button>
        </Paper>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Key</Table.Th>
              <Table.Th>Description</Table.Th>
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

            {data?.map((secret) => {
              const isEditing = editingId === secret.id;

              return (
                <Table.Tr key={secret.id}>
                  <Table.Td>
                    <Text fw={500}>{secret.key}</Text>
                  </Table.Td>
                  <Table.Td>
                    {isEditing ? (
                      <TextInput
                        value={editingDescription}
                        onChange={(e) =>
                          setEditingDescription(e.currentTarget.value)
                        }
                        size="md"
                      />
                    ) : (
                      <Text c="dimmed">{secret.description}</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {isEditing ? (
                      <PasswordInput
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.currentTarget.value)}
                        size="md"
                      />
                    ) : (
                      <Text c="dimmed">••••••••</Text>
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
                            onClick={saveEdit}
                          >
                            Save
                          </Button>
                          <Button
                            size="xs"
                            color="gray"
                            leftIcon={<IconX size={14} />}
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="xs"
                            leftIcon={<IconEdit size={14} />}
                            onClick={() => openEdit(secret.id, secret.key, secret.description)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            color="red"
                            leftIcon={<IconTrash size={14} />}
                            onClick={() => confirmDelete(secret.id, secret.key)}
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

      {/* Add Secret Modal */}
      <CustomModal
        opened={addOpen}
        title="Add Secret"
        onClose={() => setAddOpen(false)}
      >
        {/* <form autoComplete="off"> */}
          <Stack>
            <TextInput
              label="Key"
              value={newKey}
              data-autofocus
              autoComplete="off"
              onChange={(e) => setNewKey(e.currentTarget.value)}
            />
            <TextInput
              label="Description"
              value={newDescription}
              autoComplete="off"
              onChange={(e) => setNewDescription(e.currentTarget.value)}
            />
            <TextInput
              label="Value"
              autoComplete="off"
              value={newValue}
              onChange={(e) => setNewValue(e.currentTarget.value)}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={saveNewSecret}>Add</Button>
            </Group>
          </Stack>
        {/* </form> */}
      </CustomModal>

      {/* Delete Modal */}
      <CustomModal
        opened={deleteOpen}
        title="Delete Secret"
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
