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
    process.exit(1);
  }
}