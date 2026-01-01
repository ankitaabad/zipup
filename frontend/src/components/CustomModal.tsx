// src/components/CustomModal.tsx
import { Modal, Box, Text, ActionIcon, Stack, useMantineTheme } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { ReactNode } from "react";

interface CustomModalProps {
  opened: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  padding?: string | number;
}

export function CustomModal({
  opened,
  title,
  onClose,
  children,
  padding = "md"
}: CustomModalProps) {
  const theme = useMantineTheme();
  const primaryColor = theme.colors[theme.primaryColor][6]; // Mantine primary color shade 6

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      withCloseButton={false}
      padding={0}
      styles={{ modal: { overflow: "hidden" } }}
    >
      {/* Header */}
      <Box
        bg={primaryColor}
        p="sm"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <Text color="white" fw={600}>
          {title}
        </Text>
        <ActionIcon color="white" variant="transparent" onClick={onClose}>
          <IconX size={16} />
        </ActionIcon>
      </Box>

      {/* Content */}
      <Stack p={padding}>{children}</Stack>
    </Modal>
  );
}
