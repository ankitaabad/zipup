// src/components/CustomModal.tsx
import {
  Modal,
  Box,
  Text,
  ActionIcon,
  Stack,
  useMantineTheme
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { ReactNode } from "react";

interface CustomModalProps {
  opened: boolean;
  title: string;
  autoFocus?: boolean;
  onClose: () => void;
  children: ReactNode;
  padding?: string | number;
}

export function CustomModal({
  opened,
  title,
  onClose,
  autoFocus,
  children,
  padding = "md"
}: CustomModalProps) {
  const theme = useMantineTheme();
  const primaryColor = theme.colors[theme.primaryColor][6]; // Mantine primary color shade 6

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      autoFocus
      centered
      withCloseButton={false}
      padding={0}
      styles={{
        modal: {
          overflow: "hidden",
          borderRadius: theme.radius.md,
          backgroundColor:
            theme.colorScheme === "dark" ? theme.colors.dark[7] : "white"
        }
      }}
    >
      {/* Header */}
      <Box
        bg={primaryColor}
        px="md"
        py="sm"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${
            theme.colorScheme === "dark"
              ? theme.colors.dark[7]
              : theme.colors.gray[3]
          }`
        }}
      >
        <Text color="white" fw={600} fz="lg">
          {title}
        </Text>
        <ActionIcon color="white" variant="transparent" onClick={onClose}>
          <IconX size={20} />
        </ActionIcon>
      </Box>

      {/* Body */}
      <Box p={padding}>{children}</Box>
    </Modal>
  );
}
