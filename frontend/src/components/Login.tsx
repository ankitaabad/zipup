import loginSvg from "./login.svg";
import React, { useState } from "react";
import {
  Button,
  Card,
  Center,
  Container,
  PasswordInput,
  Stack,
  TextInput,
  Title,
  Text,
  Box,
  Group,
  useMantineTheme
} from "@mantine/core";
import { IconUser, IconLock, IconCloudBolt } from "@tabler/icons-react";
import { useAdminLogin } from "../apis/adminAuth";
import { useNavigate } from "react-router-dom";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const loginMutation = useAdminLogin();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    loginMutation.mutate(
      { username, password },
      {
        onSuccess: () => {
          navigate("/"); // or /admin/dashboard
        }
      }
    );
  };

  return (
    <Container
      size={420}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}
    >
      <Center style={{ width: "100%" }}>
        <Card
          shadow="xl"
          padding="xl"
          radius="md"
          withBorder
          style={{ width: "100%" }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", marginBottom: 30 }}>
            <Group justify="center" gap={6}>
              {/* <IconCloudBolt
                size={32}
                stroke={2}
                color={theme.colors.primaryColor[7]}
              /> */}
              <Title order={2} c="#1e293b">
                Paas<span style={{ color: theme.colors.primaryColor[7] }}>Up</span>
              </Title>
            </Group>
          </Box>

          {/* Error */}
          {loginMutation.isError && (
            <Text color="red" size="sm" align="center" mb="sm">
              {(loginMutation.error as any)?.response?.data?.error ??
                "Login failed"}
            </Text>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Username"
                autoFocus
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                required
                radius="sm"
                size="md"
                leftSection={<IconUser size={20} />}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                leftSection={<IconLock size={20} />}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                radius="sm"
                size="md"
              />

              <Button
                type="submit"
                fullWidth
                size="md"
                loading={loginMutation.isPending}
              >
                Login
              </Button>
            </Stack>
          </form>
        </Card>
      </Center>
    </Container>
  );
};
