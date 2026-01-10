import { notifications } from "@mantine/notifications";

interface ApiErrorResponse {
  status: number;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export function showApiError(err: unknown) {
  // Check if error is from fetch
  if (err instanceof Response) {
    // Try to parse JSON
    err
      .json()
      .then((data: ApiErrorResponse) => {
        notifications.show({
          position: "top-center",
          title: `Error ${data.status} – ${data.error.code}`,
          message: data.error.message,
          color: "red"
        });
      })
      .catch(() => {
        // fallback if response is not JSON
        notifications.show({
          position: "top-center",
          title: "Error",
          message: "Something went wrong",
          color: "red"
        });
      });
    return;
  }

  // Fallback for JS errors
  if (err instanceof Error) {
    notifications.show({
      position: "top-center",

      title: "Error",
      message: err.message,
      color: "red"
    });
    return;
  }

  // Unknown case
  notifications.show({
    position: "top-center",

    title: "Error",
    message: "An unexpected error occurred",
    color: "red"
  });
}
