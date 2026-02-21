// src/pages/Logs.tsx
import { Paper, Title, Stack } from "@mantine/core";
//todo: Remove this.
export default function Logs() {
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
      <Stack
        style={{
          flex: 1, // fill remaining space
          overflow: "hidden", // prevent inner scrollbars
        }}
      >
        <iframe
          src="/api/logs/select/vmui/" // your VMUI logs URL
          style={{
            flex: 1, // fill stack
            border: "none",
            width: "100%",
            height: "100%", // ensure full height
          }}
          title="VictoriaLogs"
        />
      </Stack>
    </Paper>
  );
}
