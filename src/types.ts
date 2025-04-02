export interface User {
  username: string;
  password: string;
  bio?: string;
  isAdmin?: boolean;
  canLogin: boolean;
  banExpiry?: string;
  balance: number;
}

export interface Post {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  isPrivate?: boolean;
  recipient?: string;
}

export interface Report {
  id: string;
  reportedUser: string;
  reason: string;
  reportedBy: string;
  createdAt: string;
  type: 'user' | 'post' | 'chat' | 'product';
  contentId?: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  author: string;
  createdAt: string;
  purchasedBy?: string;
  purchasedAt?: string;
  isDeleted?: boolean;
}