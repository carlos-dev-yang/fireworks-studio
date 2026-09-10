export type LibraryErrorCode =
  | "missingArtwork"
  | "unsupportedFormat"
  | "conflict"
  | "invalidArchive"
  | "missingProject";

/** A stable error contract for UI and recovery code. */
export class LibraryError extends Error {
  constructor(
    public readonly code: LibraryErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "LibraryError";
  }
}
