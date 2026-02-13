
  id: string;
  user_id: string;
  url: string;
  title: string;
  folder_id?: string | null;
  favorite?: boolean;
  created_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}
