export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface UserProfile {
  displayName: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
}

export interface ProfileBook {
  id: string;
  title: string;
  author: string;
  type: "OFFERED" | "WISHED";
  coverUrl?: string;
}
