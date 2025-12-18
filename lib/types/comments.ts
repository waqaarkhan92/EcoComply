export interface Comment {
  id: string;
  entity_type: 'obligation' | 'evidence' | 'document' | 'pack';
  entity_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  parent_id?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}

export interface CommentUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
}
