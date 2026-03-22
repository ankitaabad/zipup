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
