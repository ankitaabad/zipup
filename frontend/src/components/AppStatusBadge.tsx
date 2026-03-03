import { AppStatus } from "@common/index";
import { Badge } from "@mantine/core";

type Props = {
  status: AppStatus;
};

export function AppStatusBadge({ status }: Props) {
  switch (status) {
    case AppStatus.DRAFT:
      return (
        <Badge color="gray" variant="light" radius="sm">
          Draft
        </Badge>
      );

    case AppStatus.READY:
      return (
        <Badge color="blue" variant="light" radius="sm">
          Ready
        </Badge>
      );

    case AppStatus.STOPPED:
      return (
        <Badge color="indigo" variant="filled" radius="sm">
          Stopped
        </Badge>
      );

    case AppStatus.RUNNING:
      return (
        <Badge color="green" variant="filled" radius="sm">
          Running
        </Badge>
      );

    case AppStatus.STOPPED:
      return (
        <Badge color="yellow" variant="light" radius="sm">
          Stopped
        </Badge>
      );

    default:
      return null;
  }
}
