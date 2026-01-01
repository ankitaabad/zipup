// src/components/Loader.tsx
import { Center, Stack, Text } from "@mantine/core";

type LoaderProps = {
  label?: string;
  fullPage?: boolean;
};

export function Loader({ label, fullPage = false }: LoaderProps) {
  return (
    <Center
      style={{
        height: fullPage ? "100vh" : "100%",
        width: "100%",
      }}
    >
      <Stack align="center"  gap="sm">
        <div className="loader" />
        {label && (
          <Text size="sm" c="dimmed">
            {label}
          </Text>
        )}
      </Stack>
    </Center>
  );
}
