export interface UserProfile {
  displayName: string;
  city: string;
  state: string;
  createdAt?: string;
}

export interface ProfileBook {
  id: string;
  title: string;
  author: string;
  type: "OFFERED" | "WISHED";
  coverUrl?: string;
}
