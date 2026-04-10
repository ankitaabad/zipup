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
  PasswordInput,
  ThemeIcon,
  List
} from "@mantine/core";
import { useState, useEffect } from "react";
import { IconSettings } from "@tabler/icons-react";
import { useChangeAdminPassword } from "@frontend/apis/adminAuth";
import { CustomModal } from "../components/CustomModal";
import { theme } from "@frontend/theme";
import {
  useGetSettings,
  useUpdateCertEmail,
  useUpdateDomain
} from "@frontend/apis/settings";
import { useNavigate } from "react-router-dom";

/* ------------------- Types ------------------- */

type EditTarget = "password" | "email" | "domain" | null;

/* ------------------- Component ------------------- */

export function Settings() {
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const navigate = useNavigate();
  const changePassword = useChangeAdminPassword();
  const updateDomain = useUpdateDomain();
  const updateCertEmail = useUpdateCertEmail();
  const { data: settings } = useGetSettings();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [email, setEmail] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);

  /* ---------- populate settings from API ---------- */

  useEffect(() => {
    if (!settings) return;

    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    setEmail(map.cert_email ?? null);
    setDomain(map.domain ?? null);
  }, [settings]);

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
                value={null}
                description="Change your administrator account password."
                onClick={() => setEditTarget("password")}
                hideValue
              />

              <Divider />

              {/* ---------------- Email ---------------- */}
              {/* <ConfigurableSettingRow
                label="Let’s Encrypt Email"
                value={email}
                description="Used for certificate expiration notices and security alerts."
                onClick={() => setEditTarget("email")}
              />

              <Divider /> */}

              {/* ---------------- Domain ---------------- */}
              <ConfigurableSettingRow
                label="Platform Domain"
                value={domain}
                description="Admin console domain that must point to the server’s IP address where zipup cloud is installed."
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
                autoComplete="new-password"
                data-autofocus
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                autoFocus
              />

              <PasswordInput
                label="Confirm Password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              />

              {/* Validation checklist */}
              <List spacing="xs" size="sm" mt="xs">
                <List.Item
                  icon={
                    <ThemeIcon
                      size={18}
                      radius="xl"
                      color={/[A-Z]/.test(password) ? "teal" : "gray"}
                    >
                      ✓
                    </ThemeIcon>
                  }
                >
                  At least one capital letter
                </List.Item>

                <List.Item
                  icon={
                    <ThemeIcon
                      size={18}
                      radius="xl"
                      color={/[0-9]/.test(password) ? "teal" : "gray"}
                    >
                      ✓
                    </ThemeIcon>
                  }
                >
                  At least one number
                </List.Item>

                <List.Item
                  icon={
                    <ThemeIcon
                      size={18}
                      radius="xl"
                      color={/[^A-Za-z0-9]/.test(password) ? "teal" : "gray"}
                    >
                      ✓
                    </ThemeIcon>
                  }
                >
                  At least one symbol
                </List.Item>

                <List.Item
                  icon={
                    <ThemeIcon
                      size={18}
                      radius="xl"
                      color={password.length >= 8 ? "teal" : "gray"}
                    >
                      ✓
                    </ThemeIcon>
                  }
                >
                  At least 8 characters
                </List.Item>

                <List.Item
                  icon={
                    <ThemeIcon
                      size={18}
                      radius="xl"
                      color={
                        confirmPassword.length > 0 &&
                        password === confirmPassword
                          ? "teal"
                          : "gray"
                      }
                    >
                      ✓
                    </ThemeIcon>
                  }
                >
                  Passwords match
                </List.Item>
              </List>

              <Group justify="flex-end" mt="md">
                <Button
                  disabled={
                    password !== confirmPassword ||
                    password.length < 8 ||
                    !/[A-Z]/.test(password) ||
                    !/[0-9]/.test(password) ||
                    !/[^A-Za-z0-9]/.test(password)
                  }
                  onClick={() => {
                    changePassword.mutate({ new_password: password });
                    setEditTarget(null);
                    navigate("/login");
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
                <Button
                  onClick={() => {
                    if (!email) return;
                    updateCertEmail.mutate({ email });
                    setEditTarget(null);
                  }}
                >
                  Save
                </Button>
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
                data-autofocus
                value={domain ?? ""}
                onChange={(e) => setDomain(e.currentTarget.value)}
                autoFocus
              />

              <Group justify="flex-end" mt="md">
                <Button
                  onClick={() => {
                    if (!domain) return;
                    updateDomain.mutate({ domain });
                    setEditTarget(null);
                  }}
                >
                  Save
                </Button>
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
