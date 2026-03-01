// src/components/AppStatsDashboard.tsx

import { useEffect, useState } from "react";
import {
  Card,
  Group,
  Text,
  Stack,
  Title,
  Badge,
  Divider,
  Center,
  Loader,
  SimpleGrid
} from "@mantine/core";
import { useAppStats } from "../apis/stats";
import { CustomLoader } from "./CustomLoader";

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </Group>
  );
}

function ContainerCard({
  name,
  instance,
  cpu,
  mem,
  rx,
  tx
}: {
  name: string;
  instance: string;
  cpu: number;
  mem: number;
  rx: number;
  tx: number;
}) {
  return (
    <Card withBorder radius="md" p="sm">
      <Group justify="space-between" mb={10}>
        <Badge variant="light" radius="sm">
          {name?.toUpperCase()}
        </Badge>
        {/* <Badge variant="light">#{instance}</Badge> */}
      </Group>

      <Stack gap={4}>
        <StatRow label="CPU" value={`${cpu.toFixed(2)} %`} />
        <StatRow
          label="Memory"
          value={`${(mem / 1024 / 1024).toFixed(1)} MB`}
        />
        <StatRow label="Network In" value={`${(rx / 1024).toFixed(1)} KB`} />
        <StatRow label="Network Out" value={`${(tx / 1024).toFixed(1)} KB`} />
      </Stack>
    </Card>
  );
}

export default function AppStatsDashboard() {
  const [polling, setPolling] = useState(true);
  const { data, isLoading } = useAppStats(polling);

  /* Pause polling when tab is hidden */
  useEffect(() => {
    const handler = () => setPolling(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  if (isLoading) {
    return (
      <Center h={300}>
        <CustomLoader label="Loading app stats..." />
      </Center>
    );
  }

  const systemApps = (data ?? []).filter((c) => c.appType === "system");
  const userApps = (data ?? []).filter((c) => c.appType === "user");

  return (
    <Stack p="md" gap="xl">
      {/* SYSTEM APPS */}
      <Stack gap="sm">
        <Title order={4}>System Apps</Title>

        {systemApps.length === 0 ? (
          <Text size="sm" c="dimmed">
            No system containers running
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {systemApps.map((c) => (
              <ContainerCard
                key={c.id}
                name={c.appName}
                instance={c.instance}
                cpu={c.cpuPercent}
                mem={c.memoryUsage}
                rx={c.networkRx}
                tx={c.networkTx}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>

      <Divider />

      {/* USER APPS */}
      <Stack gap="sm">
        <Title order={4}>User Apps</Title>

        {userApps.length === 0 ? (
          <Text size="sm" c="dimmed">
            No user applications running
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {userApps.map((c) => (
              <ContainerCard
                key={c.id}
                name={c.appName}
                instance={c.instance}
                cpu={c.cpuPercent}
                mem={c.memoryUsage}
                rx={c.networkRx}
                tx={c.networkTx}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Stack>
  );
}
