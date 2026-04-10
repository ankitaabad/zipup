import { useState } from "react";
import {
  Button,
  Group,
  Paper,
  Table,
  Text,
  TextInput,
  Stack,
  Center,
  Badge
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconDownload,
  IconEye,
  IconShieldLock
} from "@tabler/icons-react";
import {
  useCreateWireguardPeer,
  useDeleteWireguardPeer,
  useGetAllWireguardPeers
} from "../apis/wireguard";
import { CustomModal } from "./CustomModal";
import { timeAgo } from "@frontend/helper";

export function Wireguard() {
  const { data, isLoading } = useGetAllWireguardPeers();
  const create = useCreateWireguardPeer();
  const remove = useDeleteWireguardPeer();

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const [showOpen, setShowOpen] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<any>(null);

  const saveNewPeer = () => {
    if (!newName.trim()) return;

    create.mutate({
      name: newName.trim(),
      description: newDescription
    });

    setNewName("");
    setNewDescription("");
    setAddOpen(false);
  };

  const confirmDelete = (id: string, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) remove.mutate(deleteId);

    setDeleteId(null);
    setDeleteName("");
    setDeleteOpen(false);
  };

  const handleDownload = (peerId: string) => {
    window.open(`/api/wireguard/peers/${peerId}/config`);
  };

  const getStatusBadge = (status: string) => {
    if (status === "ACTIVE") {
      return <Badge color="green">Active</Badge>;
    }

    if (status === "FAILED") {
      return <Badge color="red">Failed</Badge>;
    }

    return <Badge color="yellow">Creating</Badge>;
  };

  return (
    <Paper p="md" withBorder bg="gray.0">
      <Group justify="space-between" mb="sm">
        <Text fw={600}>WireGuard Peers</Text>

        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() => setAddOpen(true)}
        >
          Add Peer
        </Button>
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        Peers that can connect to your private network via WireGuard. Used to connect to Postgres, Valkey and Victorialogs.
      </Text>

      {!isLoading && (!data || data.length === 0) ? (
        <Paper
          p="xl"
          radius="md"
          withBorder
          style={{ textAlign: "center", backgroundColor: "#f8f9fa" }}
        >
          <Center mb="sm">
            <IconShieldLock size={48} color="#9CA3AF" />
          </Center>

          <Text size="lg" fw={500} mb="xs">
            No Peers created
          </Text>

          <Text color="dimmed" size="sm" mb="md">
            Create a Peer to connect to your private network
          </Text>

          <Button size="sm" onClick={() => setAddOpen(true)}>
            Add Peer
          </Button>
        </Paper>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Created At</Table.Th>
              <Table.Th>IP</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th w={280}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={5}>Loading…</Table.Td>
              </Table.Tr>
            )}

            {data?.map((peer: any) => {
              const ip = `10.13.13.${peer.ip_index}`;
              const disabled = peer.status === "IN_PROGRESS";

              return (
                <Table.Tr key={peer.id}>
                  <Table.Td>
                    <Text fw={500}>{peer.name}</Text>
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm">{peer.description || "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{timeAgo(peer.created_at)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text>{ip}</Text>
                  </Table.Td>

                  <Table.Td>{getStatusBadge(peer.status)}</Table.Td>

                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {/* <Button
                        size="xs"
                        variant="light"
                        disabled={disabled}
                        leftSection={<IconEye size={14} />}
                        onClick={() => {
                          setSelectedPeer(peer);
                          setShowOpen(true);
                        }}
                      >
                        Show
                      </Button> */}

                      <Button
                        size="xs"
                        variant="light"
                        disabled={disabled}
                        leftSection={<IconDownload size={14} />}
                        onClick={() => handleDownload(peer.id)}
                      >
                        Download
                      </Button>

                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => confirmDelete(peer.id, peer.name)}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      {/* Add Peer Modal */}
      <CustomModal
        opened={addOpen}
        title="Add Peer"
        onClose={() => setAddOpen(false)}
      >
        <Stack>
          <TextInput
            data-autofocus
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />

          <TextInput
            label="Description"
            value={newDescription}
            mt="sm"
            onChange={(e) => setNewDescription(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button onClick={saveNewPeer}>Create Peer</Button>
          </Group>
        </Stack>
      </CustomModal>

      {/* Delete Modal */}
      <CustomModal
        opened={deleteOpen}
        title="Delete Peer"
        onClose={() => setDeleteOpen(false)}
      >
        <Stack>
          <Text>
            Are you sure you want to delete <b>{deleteName}</b>?
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

      {/* Show Peer Modal */}
      <CustomModal
        opened={showOpen}
        title="Peer Details"
        onClose={() => setShowOpen(false)}
      >
        {selectedPeer && (
          <Stack>
            <Text>
              <b>Name:</b> {selectedPeer.name}
            </Text>

            <Text>
              <b>Description:</b> {selectedPeer.description || "-"}
            </Text>

            <Text>
              <b>IP:</b> 10.13.13.{selectedPeer.ip_index}
            </Text>

            <Text>
              <b>Status:</b> {selectedPeer.status}
            </Text>

            <Group justify="flex-end" mt="md">
              <Button
                leftSection={<IconDownload size={14} />}
                onClick={() => handleDownload(selectedPeer.id)}
              >
                Download Config
              </Button>
            </Group>
          </Stack>
        )}
      </CustomModal>
    </Paper>
  );
}
