// src/components/Settings.tsx
import {
  Tabs,
  Paper,
  Stack,
  Group,
  Text,
  Divider,
  Title,
  Box,
  UnstyledButton,
  Badge,
  Button,
  TextInput,
  PasswordInput
} from "@mantine/core";
import { useState } from "react";
import { IconSettings } from "@tabler/icons-react";
import { useChangeAdminPassword } from "@frontend/apis/adminAuth";
import { CustomModal } from "../components/CustomModal";
import { theme } from "@frontend/theme";

/* ------------------- Types ------------------- */

type EditTarget = "password" | "email" | "domain" | null;

/* ------------------- Component ------------------- */

export function Settings() {
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const changePassword = useChangeAdminPassword();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [email, setEmail] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);

  return (
    <Paper
      p="md"
      radius="md"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "80vh"
      }}
    >
      <Tabs defaultValue="general">
        <Tabs.List>
          <Tabs.Tab value="general" leftSection={<IconSettings size={16} />}>
            General
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general" pt="md">
          <Paper withBorder p="lg" radius="md" bg="gray.0">
            <Stack gap="sm">
              {/* Header */}
              <Group justify="space-between">
                <Title order={4}>Global Settings</Title>
              </Group>

              <Divider />

              {/* ---------------- Admin Password ---------------- */}
              <ConfigurableSettingRow
                label="Admin Password"
                value={null} // intentionally no value shown
                description="Change your administrator account password."
                onClick={() => setEditTarget("password")}
                hideValue
              />

              <Divider />

              {/* ---------------- Email ---------------- */}
              <ConfigurableSettingRow
                label="Let’s Encrypt Email"
                value={email}
                description="Used for certificate expiration notices and security alerts."
                onClick={() => setEditTarget("email")}
              />

              <Divider />

              {/* ---------------- Domain ---------------- */}
              <ConfigurableSettingRow
                label="Platform Domain"
                value={domain}
                description="Primary domain used for your platform. Changing this may require DNS updates."
                onClick={() => setEditTarget("domain")}
              />
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* ---------------- Password Modal ---------------- */}
        {editTarget === "password" && (
          <CustomModal
            opened
            title="Change Admin Password"
            onClose={() => {
              setPassword("");
              setConfirmPassword("");
              setEditTarget(null);
            }}
          >
            <Stack>
              <PasswordInput
                label="New Password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                autoFocus
              />

              <PasswordInput
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              />

              <Group justify="flex-end" mt="md">
                <Button
                  onClick={() => {
                    if (password !== confirmPassword) return;
                    changePassword.mutate({ new_password: password });
                    setEditTarget(null);
                  }}
                >
                  Update Password
                </Button>
              </Group>
            </Stack>
          </CustomModal>
        )}

        {/* ---------------- Email Modal ---------------- */}
        {editTarget === "email" && (
          <CustomModal
            opened
            title="Update Let’s Encrypt Email"
            onClose={() => setEditTarget(null)}
          >
            <Stack>
              <TextInput
                label="Email Address"
                value={email ?? ""}
                onChange={(e) => setEmail(e.currentTarget.value)}
                autoFocus
              />

              <Group justify="flex-end" mt="md">
                <Button onClick={() => setEditTarget(null)}>Save</Button>
              </Group>
            </Stack>
          </CustomModal>
        )}

        {/* ---------------- Domain Modal ---------------- */}
        {editTarget === "domain" && (
          <CustomModal
            opened
            title="Update Platform Domain"
            onClose={() => setEditTarget(null)}
          >
            <Stack>
              <TextInput
                label="Domain"
                value={domain ?? ""}
                onChange={(e) => setDomain(e.currentTarget.value)}
                autoFocus
              />

              <Group justify="flex-end" mt="md">
                <Button onClick={() => setEditTarget(null)}>Save</Button>
              </Group>
            </Stack>
          </CustomModal>
        )}
      </Tabs>
    </Paper>
  );
}

/* ------------------- Reusable Row ------------------- */

function ConfigurableSettingRow({
  label,
  value,
  description,
  onClick,
  hideValue
}: {
  label: string;
  value: string | null;
  description: string;
  onClick: () => void;
  hideValue?: boolean;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{ width: "100%", textAlign: "left" }}
    >
      <Box
        p="sm"
        style={{
          borderRadius: 8,
          transition: "background-color 120ms ease"
        }}
        className="config-row"
      >
        <Group align="center">
          <Text size="sm" fw={500}>
            {label}
          </Text>

          <Text size="xs" c="dimmed">
            [ Click Row to Edit ]
          </Text>
        </Group>

        {!hideValue && (
          <>
            {value ? (
              <Text
                size="sm"
                mt={4}
                fw={500}
                style={{ fontFamily: "monospace" }}
                c={theme.colors.primaryColor[7]}
              >
                {value}
              </Text>
            ) : (
              <Badge color="red" variant="light" mt={6}>
                Not set
              </Badge>
            )}
          </>
        )}

        <Text size="xs" c="dimmed" mt={6} maw={520}>
          [ {description} ]
        </Text>
      </Box>
    </UnstyledButton>
  );
}
