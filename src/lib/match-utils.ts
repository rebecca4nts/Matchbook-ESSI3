import { Book, MatchResult, MatchSuggestion, UserProfile } from "@/lib/types";

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const sameTitle = (first: Book, second: Book) => normalize(first.title) === normalize(second.title);

const isSamePlace = (first: string, second: string) => normalize(first) === normalize(second);

export function findMatches(
  currentUserId: string,
  currentProfile: UserProfile,
  books: Book[],
  profiles: Map<string, UserProfile>
): MatchResult[] {
  const currentBooks = books.filter((book) => book.userId === currentUserId);
  const currentWished = currentBooks.filter((book) => book.type === "WISHED");
  const currentOffered = currentBooks.filter((book) => book.type === "OFFERED");
  const results: MatchResult[] = [];

  for (const [userId, profile] of profiles) {
    if (userId === currentUserId || !profile.city || !profile.state || !isSamePlace(profile.state, currentProfile.state)) continue;

    const candidateBooks = books.filter((book) => book.userId === userId);
    const wishedBooksOfferedByUser = currentWished.filter((wished) =>
      candidateBooks.some((book) => book.type === "OFFERED" && sameTitle(wished, book))
    );

    if (!wishedBooksOfferedByUser.length) continue;

    const offeredBooksWishedByUser = currentOffered.filter((offered) =>
      candidateBooks.some((book) => book.type === "WISHED" && sameTitle(offered, book))
    );

    results.push({
      userId,
      profile,
      wishedBooksOfferedByUser,
      offeredBooksWishedByUser,
      isPerfect: offeredBooksWishedByUser.length > 0,
      isSameCity: isSamePlace(profile.city, currentProfile.city),
    });
  }

  return results.sort((first, second) =>
    Number(second.isPerfect) - Number(first.isPerfect) ||
    Number(second.isSameCity) - Number(first.isSameCity) ||
    second.wishedBooksOfferedByUser.length - first.wishedBooksOfferedByUser.length ||
    first.profile.displayName.localeCompare(second.profile.displayName, "pt-BR")
  );
}

export function findRegionalSuggestions(
  currentUserId: string,
  currentProfile: UserProfile,
  books: Book[],
  profiles: Map<string, UserProfile>
): MatchSuggestion[] {
  const suggestions = books.flatMap((book) => {
    const profile = profiles.get(book.userId);
    if (
      book.userId === currentUserId ||
      book.type !== "OFFERED" ||
      !profile?.city ||
      !profile.state ||
      !isSamePlace(profile.state, currentProfile.state)
    ) return [];

    return [{ book, profile, isSameCity: isSamePlace(profile.city, currentProfile.city) }];
  });

  return suggestions.sort((first, second) =>
    Number(second.isSameCity) - Number(first.isSameCity) ||
    first.book.title.localeCompare(second.book.title, "pt-BR")
  );
}
