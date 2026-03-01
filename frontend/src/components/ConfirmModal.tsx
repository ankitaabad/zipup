// ConfirmModal.tsx
import { Button, Group, Text } from "@mantine/core";
import { CustomModal } from "./CustomModal";

interface ConfirmModalProps {
  opened: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  opened,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmColor = "red",
  onConfirm,
  onClose
}: ConfirmModalProps) {
  return (
    <CustomModal opened={opened} title={title} onClose={onClose}>
      {body && (
        <Text mb="md" size="sm" color="dimmed">
          {body}
        </Text>
      )}

      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          color={confirmColor}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </Group>
    </CustomModal>
  );
}
