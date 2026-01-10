import {
  Tabs,
  Card,
  Stack,
  PasswordInput,
  TextInput,
  Switch,
  Button,
  Group,
  Text,
  Divider
} from "@mantine/core";
import { IconSettings, IconShieldLock } from "@tabler/icons-react";
import { useState } from "react";

export function Settings() {
  /* ---------------- General ---------------- */
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [leEmail, setLeEmail] = useState("");
  const [debugLogs, setDebugLogs] = useState(false);

  /* ---------------- 2FA ---------------- */
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [otp, setOtp] = useState("");

  return (
    <Tabs defaultValue="general">
      <Tabs.List>
        <Tabs.Tab value="general" leftSection={<IconSettings size={16} />}>
          General
        </Tabs.Tab>
        <Tabs.Tab value="2fa" leftSection={<IconShieldLock size={16} />}>
          2FA
        </Tabs.Tab>
      </Tabs.List>

      {/* ---------------- General Tab ---------------- */}
      <Tabs.Panel value="general" pt="md">
        <Stack gap="md">
          {/* Change Password */}
          <Card withBorder>
            <Text fw={600} mb="xs">
              Change password
            </Text>

            <Stack>
              <PasswordInput
                label="New password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
              <PasswordInput
                label="Confirm password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.currentTarget.value)
                }
              />

              <Group justify="flex-end">
                <Button>Update password</Button>
              </Group>
            </Stack>
          </Card>

          {/* Let's Encrypt Email */}
          <Card withBorder>
            <Text fw={600} mb="xs">
              Let’s Encrypt
            </Text>

            <Stack>
              <TextInput
                label="Email address"
                description="Used for certificate expiration notices"
                value={leEmail}
                onChange={(e) => setLeEmail(e.currentTarget.value)}
              />

              <Group justify="flex-end">
                <Button>Save email</Button>
              </Group>
            </Stack>
          </Card>

          {/* Debug Logs */}
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text fw={600}>Debug logs</Text>
                <Text size="sm" c="dimmed">
                  Enable verbose logging for troubleshooting
                </Text>
              </div>

              <Switch
                checked={debugLogs}
                onChange={(e) =>
                  setDebugLogs(e.currentTarget.checked)
                }
              />
            </Group>
          </Card>
        </Stack>
      </Tabs.Panel>

      {/* ---------------- 2FA Tab ---------------- */}
      <Tabs.Panel value="2fa" pt="md">
        <Stack gap="md">
          <Card withBorder>
            <Group justify="space-between" mb="sm">
              <div>
                <Text fw={600}>Two-factor authentication</Text>
                <Text size="sm" c="dimmed">
                  Protect your account with an authenticator app
                </Text>
              </div>

              <Switch
                checked={twoFaEnabled}
                onChange={(e) =>
                  setTwoFaEnabled(e.currentTarget.checked)
                }
              />
            </Group>

            {twoFaEnabled && (
              <>
                <Divider my="sm" />

                {/* QR code placeholder */}
                <Card withBorder>
                  <Text size="sm" mb="xs">
                    Scan QR code with Google Authenticator or Authy
                  </Text>

                  <div
                    style={{
                      width: 160,
                      height: 160,
                      background: "#eee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6
                    }}
                  >
                    QR
                  </div>
                </Card>

                <TextInput
                  label="Verification code"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.currentTarget.value)}
                />

                <Group justify="space-between">
                  <Button variant="light" color="red">
                    Regenerate recovery codes
                  </Button>

                  <Button>Verify & enable</Button>
                </Group>
              </>
            )}
          </Card>
        </Stack>
      </Tabs.Panel>
    </Tabs>
  );
}
