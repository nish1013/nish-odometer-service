export class UnreadableImageError extends Error {
  constructor(options?: ErrorOptions) {
    super(
      "Could not extract a mileage reading from the provided image",
      options,
    );
    this.name = "UnreadableImageError";
  }
}
