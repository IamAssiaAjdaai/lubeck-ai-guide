/** Expected absence is distinct from configuration, query and integrity failures. */
export class PublicContentNotFoundError extends Error {
  constructor(message = "Published content not found.") {
    super(message);
    this.name = "PublicContentNotFoundError";
  }
}
