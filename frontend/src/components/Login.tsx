import React, { useState } from "react";
import { useForm } from "@mantine/form";
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
import { IconUser, IconLock } from "@tabler/icons-react";
import { useAdminLogin } from "../apis/adminAuth";
import { useNavigate } from "react-router-dom";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { AdminLoginSchema } from "@common/index";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const loginMutation = useAdminLogin();
  const loginForm = useForm({
    initialValues: {
      username: "",
      password: ""
    },
    validate: zod4Resolver(AdminLoginSchema)
  });


  const handleSubmit = (
    { username, password }: typeof loginForm.values,
    e: React.FormEvent<HTMLFormElement> | undefined
  ) => {
    e?.preventDefault();

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
              <Text
                component="h2"
                size={"35px"}
                fw={700}
                variant="gradient"
                gradient={{
                  from: theme.colors.primaryColor[7],
                  to: "black",
                  deg: 30
                }}
                mb={20}
              >
                zipup
              </Text>
            </Group>
          </Box>

          {/* Error */}
          {loginMutation.isError && (
            <Text c="red" size="sm" align="center" mb="sm">
              {(loginMutation.error as any)?.response?.data?.error ??
                "Login failed"}
            </Text>
          )}

          {/* Form */}
          <form onSubmit={loginForm.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Username"
                autoFocus
                placeholder="Enter your username"
                required
                radius="sm"
                size="md"
                leftSection={<IconUser size={20} />}
                key={loginForm.key("username")}
                {...loginForm.getInputProps("username")}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                leftSection={<IconLock size={20} />}
                required
                radius="sm"
                size="md"
                key={loginForm.key("password")}
                {...loginForm.getInputProps("password")}
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
