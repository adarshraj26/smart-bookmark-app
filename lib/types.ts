
export interface Bookmark {
  id: string;
  user_id: string;
  url: string;
  title: string;
  favorite?: boolean;
  pinned?: boolean;
  created_at: string;
}
}

// Folder interface removed

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}
