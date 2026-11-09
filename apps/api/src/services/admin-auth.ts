import { timingSafeEqual } from "node:crypto";

export class AdminAuth {
  constructor(private readonly configuredToken: string) {}

  authorize(presentedToken: string): boolean {
    if (!this.configuredToken || !presentedToken) return false;
    const expected = Buffer.from(this.configuredToken);
    const actual = Buffer.from(presentedToken);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  authorizeHeader(header: string | undefined): boolean {
    if (!header) return false;
    if (header.startsWith("Bearer ")) return this.authorize(header.slice(7));
    if (!header.startsWith("Basic ")) return false;
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      return separator >= 0 && this.authorize(decoded.slice(separator + 1));
    } catch {
      return false;
    }
  }
}
