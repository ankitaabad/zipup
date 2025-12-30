import {
  Paper,
  Stack,
  Group,
  Text,
  Title,
  Select,
  Button,
  Badge,
  Divider,
  Modal,
} from "@mantine/core";
import { useState } from "react";

type DeployStatus = "idle" | "deploying";

export default function Deployment() {
  // Mock data
  const versions = [
    "v1.3.0",
    "v1.2.4",
    "v1.2.3",
    "v1.2.2",
  ];

  const [currentVersion, setCurrentVersion] = useState("v1.2.3");
  const [selectedVersion, setSelectedVersion] = useState<string | null>(
    currentVersion
  );
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canDeploy =
    selectedVersion &&
    selectedVersion !== currentVersion &&
    status === "idle";

  function deploy() {
    setConfirmOpen(false);
    setStatus("deploying");

    // Mock async deploy
    setTimeout(() => {
      setCurrentVersion(selectedVersion!);
      setStatus("idle");
    }, 2000);
  }

  return (
    <Paper withBorder p="lg" radius="md" bg={"gray.0"}>
      <Stack gap="lg">
        <Title order={4}>Deployment</Title>

        {/* Current version */}
        <Group justify="space-between">
          <div>
            <Text size="sm" fw={500}>
              Current version
            </Text>
            <Text size="sm" c="dimmed">
              {currentVersion}
            </Text>
          </div>

          <Badge color="green" variant="light">
            Deployed
          </Badge>
        </Group>

        <Divider />

        {/* Deploy new version */}
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            Deploy a different version
          </Text>

          <Group align="flex-end">
            <Select
              placeholder="Select version"
              data={versions}
              value={selectedVersion}
              onChange={setSelectedVersion}
              style={{ flex: 1 }}
            />

            <Button
              disabled={!canDeploy}
              loading={status === "deploying"}
              onClick={() => setConfirmOpen(true)}
            >
              Deploy
            </Button>
          </Group>

          <Text size="xs" c="dimmed">
            Selecting a version does not deploy automatically.
          </Text>
        </Stack>

        {/* Status */}
        <Divider />

        <Group justify="space-between">
          <Text size="sm" fw={500}>
            Deployment status
          </Text>

          {status === "idle" ? (
            <Badge color="gray" variant="light">
              Idle
            </Badge>
          ) : (
            <Badge color="blue" variant="light">
              Deploying…
            </Badge>
          )}
        </Group>
      </Stack>

      {/* Confirm modal */}
      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm deployment"
        centered
      >
        <Stack>
          <Text size="sm">
            Deploy <strong>{selectedVersion}</strong> instead of{" "}
            <strong>{currentVersion}</strong>?
          </Text>

          <Text size="xs" c="dimmed">
            This will replace the currently running version.
          </Text>

          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={deploy}>Deploy</Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
