import boxen from "boxen";
import ora from "ora";

export async function step<T>(
  message: string,
  fn: () => Promise<T>
): Promise<T> {
  const spinner = ora(message).start();

  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (err: any) {
    spinner.fail(err.message ?? "Failed");
    throw err;
  }
}
export function printFailureLogs(logs: string) {
  console.log(
    boxen(logs, {
      title: "Deployment Failed: Container Logs",
      titleAlignment: "center",
      padding: 1,
      margin: 1,
      borderStyle: "bold"
    })
  );
}

export async function callFetch<T>(fn: () => Promise<Response>): Promise<T> {
  try {
    let response;
    try {
      response = await fn();
    } catch (error) {
      throw new Error(
        `${error?.cause || error?.message || "Unexpected error occurred"}`
      );
    }

    let json: any;

    try {
      json = await response.json();
    } catch {
      throw new Error(`Invalid JSON response (status: ${response.status})`);
    }
    if (!response.ok) {
      const message =
        json?.error?.message ||
        json?.message ||
        `Request failed with status ${response.status}`;

      throw new Error(message);
    }

    if (json?.error) {
      throw new Error(json.error.message);
    }

    return json.data as T;
  } catch (err: any) {
    throw new Error(err?.message || "Unexpected error occurred");
  }
}
