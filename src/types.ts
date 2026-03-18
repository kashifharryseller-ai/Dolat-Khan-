export interface Book {
  id: number;
  title: string;
  author: string;
  author_bio?: string;
  category: string;
  price: number;
  description: string;
  cover_icon: string;
  is_bestseller: boolean;
  is_audiobook: boolean;
  audio_duration?: string;
  formats?: string[]; // e.g., ['PDF', 'EPUB', 'Audio']
  created_at: string;
}

export interface Review {
  id?: string;
  userId: string;
  userName: string;
  userPhoto: string;
  bookId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Event {
  id: number;
  title: string;
  celebrity_name: string;
  celebrity_title: string;
  event_date: string;
  quote: string;
  image_icon: string;
}

export interface Subscription {
  id: number;
  name: string;
  price: number;
  duration: string;
  features: string;
  is_popular: boolean;
  whatsapp_link?: string;
}

export interface User {
  id: number;
  email: string;
  role: string;
  points?: number;
  level?: string;
  created_at: string;
}

export interface Stats {
  books: number;
  events: number;
  users: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
