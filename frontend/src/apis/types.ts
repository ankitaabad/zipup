export interface App {
  id: string;
  name: string;
  type: string;
  start_command: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  domain: string | null;
  path_prefix: string | null;
  redis_prefix: string | null;
  redis_username: string | null;
  redis_password: string | null;
}

export interface AppListItem extends App {
  api_key_suffix: string;
  secret_key_suffix: string;
}
