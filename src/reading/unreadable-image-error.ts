export class UnreadableImageError extends Error {
  constructor() {
    super("Could not extract a mileage reading from the provided image");
    this.name = "UnreadableImageError";
  }
}
