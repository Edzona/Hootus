export function withAuthor<T extends { author_name: string | null }>(row: T) {
  const { author_name, ...data } = row;
  return { ...data, author: { name: author_name } };
}
