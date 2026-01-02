// src/pages/Dashboard.tsx
import { Paper, Title, Stack } from "@mantine/core";

export default function Dashboard() {
  return (
    <Paper
      p="md"
      radius="md"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1
      }}
    >
      <Title order={3}>Dashboard</Title>
      <Stack
        style={{
          flex: 1, // fill remaining space
          overflow: "hidden" // prevent inner scrollbars
        }}
      >
        Nothing for now
      </Stack>
    </Paper>
  );
}
