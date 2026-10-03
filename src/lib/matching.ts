import type { Book } from "@/lib/book-service";
import type { Coordinates, UserProfile } from "@/lib/types";

export interface BookMatch {
  wanted: Book;
  offered: Book;
}

export interface UserMatch {
  userId: string;
  profile: UserProfile;
  books: BookMatch[];
  distanceKm: number | null;
}

export function normalizeBookValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasCoordinates(profile: UserProfile): profile is UserProfile & Coordinates {
  return typeof profile.latitude === "number" && typeof profile.longitude === "number";
}

function locationRank(candidate: UserProfile, current: UserProfile): number {
  if (!candidate.city || !candidate.state || !current.city || !current.state) return 2;
  if (normalizeBookValue(candidate.city) === normalizeBookValue(current.city) && candidate.state === current.state) return 0;
  if (candidate.state === current.state) return 1;
  return 2;
}

export function findUserMatches({
  currentUserId,
  wishedBooks,
  books,
  profiles,
  currentProfile,
}: {
  currentUserId: string;
  wishedBooks: Book[];
  books: Book[];
  profiles: Map<string, UserProfile>;
  currentProfile: UserProfile;
}): UserMatch[] {
  const wishes = wishedBooks.filter((book) => book.type === "WISHED" && book.status === "available");
  const matches = new Map<string, BookMatch[]>();

  for (const offered of books) {
    if (offered.type !== "OFFERED" || offered.status !== "available" || offered.userId === currentUserId) continue;
    const profile = profiles.get(offered.userId);
    if (!profile) continue;

    const matchingWishes = wishes.filter((wanted) =>
      normalizeBookValue(wanted.title) === normalizeBookValue(offered.title) &&
      normalizeBookValue(wanted.author) === normalizeBookValue(offered.author)
    );

    if (matchingWishes.length === 0) continue;
    const userMatches = matches.get(offered.userId) ?? [];
    for (const wanted of matchingWishes) userMatches.push({ wanted, offered });
    matches.set(offered.userId, userMatches);
  }

  return Array.from(matches, ([userId, userBooks]) => {
    const profile = profiles.get(userId)!;
    const distanceKm = hasCoordinates(currentProfile) && hasCoordinates(profile)
      ? calculateDistanceKm(currentProfile, profile)
      : null;
    return { userId, profile, books: userBooks, distanceKm };
  }).sort((left, right) => {
    if (left.distanceKm !== null && right.distanceKm !== null) return left.distanceKm - right.distanceKm;
    if (left.distanceKm !== null) return -1;
    if (right.distanceKm !== null) return 1;
    return locationRank(left.profile, currentProfile) - locationRank(right.profile, currentProfile);
  });
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return "a menos de 1 km";
  return `a cerca de ${Math.round(distanceKm)} km`;
}
