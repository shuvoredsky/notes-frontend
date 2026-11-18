export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  meta: PaginationMeta;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  interests: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  _id: string;
  name: string;
  email: string;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  owner: string | UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  _id: string;
  title: string;
  content: string;
  author: string | UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface InterestGroup {
  _id?: string;
  interest: string;
  count: number;
  users: UserSummary[];
}

export interface UserPostsData {
  user: UserSummary;
  posts: Post[];
}

export interface AuthData {
  user: User;
  token: string;
}
