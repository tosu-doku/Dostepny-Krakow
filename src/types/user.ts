export interface User {
  id: string;
  nickname: string;
  email: string;
  created_at: string;
  updated_at: string;
  is_banned: boolean;
  contributions_count?: number;
}

export interface RegisterInput {
  nickname: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface BadActorPurgeResult {
  success: boolean;
  bad_actor_id: string;
  nickname: string;
  purged_barriers_count: number;
  purged_storage_images_count: number;
}
