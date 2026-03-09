import React from "react";
import { useForm } from "@mantine/form";
import {
  Button,
  Card,
  Center,
  Container,
  PasswordInput,
  Stack,
  TextInput,
  Text,
  Box,
  Group,
  useMantineTheme,
  Divider,
  Image
} from "@mantine/core";
import logoImage from "../../public/logo.svg";
import { IconUser, IconLock } from "@tabler/icons-react";
import { useAdminLogin } from "../apis/adminAuth";
import { useNavigate } from "react-router-dom";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { AdminLoginSchema } from "@zipup/common";
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

  const handleSubmit = ({ username, password }: typeof loginForm.values) => {
    loginMutation.mutate(
      { username, password },
      {
        onSuccess: () => navigate("/")
      }
    );
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        // background: `linear-gradient(
        //   135deg,
        //   ${theme.colors.gray[0]} 0%,
        //   ${theme.colors.gray[2]} 100%
        // )`,
        background: "#F6F4F5",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <Container size={420}>
        <Card
          shadow="lg"
          padding="xl"
          radius="lg"
          withBorder
          // bg="white"
          bg="gray.0"
        >
          {/* Brand */}
          <Box ta="center" mb={40}>
            <Text
              size="44px"
              fw={900}
              lh={1}
              style={{
                letterSpacing: "-1px"
              }}
            >
              {/* <span style={{ color: theme.colors.gray[8] }}>zip</span>
              <span style={{ color: "var(--mantine-primary-color-7)" }}>
                up
              </span> */}
                <Image src={logoImage} h={40} w="auto" fit="contain" mx="auto" />
            </Text>
          </Box>

          {/* Error */}
          {loginMutation.isError && (
            <Box
              mb="md"
              p="sm"
              style={{
                background: theme.colors.red[0],
                borderRadius: 8
              }}
            >
              <Text c="red" size="sm" ta="center">
                {(loginMutation.error as any)?.response?.data?.error ??
                  "Invalid username or password"}
              </Text>
            </Box>
          )}

          {/* Form */}
          <form onSubmit={loginForm.onSubmit(handleSubmit)}>
            <Stack gap="lg">
              <TextInput
                label="Username"
                autoFocus
                placeholder="Enter username"
                radius="md"
                size="md"
                leftSection={<IconUser size={18} />}
                {...loginForm.getInputProps("username")}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter password"
                radius="md"
                size="md"
                leftSection={<IconLock size={18} />}
                {...loginForm.getInputProps("password")}
              />

              <Button
                type="submit"
                fullWidth
                size="md"
                radius="md"
                loading={loginMutation.isPending}
              >
                Sign in
              </Button>
            </Stack>
          </form>
        </Card>
      </Container>
    </Box>
  );
};
