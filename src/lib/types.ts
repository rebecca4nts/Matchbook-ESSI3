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

export interface Book extends ProfileBook {
  userId: string;
  genre?: string;
  createdAt?: string;
}

export interface MatchResult {
  userId: string;
  profile: UserProfile;
  wishedBooksOfferedByUser: Book[];
  offeredBooksWishedByUser: Book[];
  isPerfect: boolean;
  isSameCity: boolean;
}

export interface MatchSuggestion {
  book: Book;
  profile: UserProfile;
  isSameCity: boolean;
}
