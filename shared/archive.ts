export const ARCHIVE_FILTERS = ["active", "archived", "all"] as const;

export type ArchiveFilter = (typeof ARCHIVE_FILTERS)[number];

export function parseArchiveFilter(value: string | null): ArchiveFilter {
  switch (value) {
    case "archived":
    case "all":
    case "active":
      return value;
    default:
      return "active";
  }
}
