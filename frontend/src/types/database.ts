export interface Post {
  id: string;
  user_id: string;
  comment: string | null;
  latitude: number;
  longitude: number;
  image_url: string | null;
  address: string | null;
  created_at: string;
}

export interface User {
  id: string;
  line_user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface PostWithUser extends Post {
  users: User;
}
