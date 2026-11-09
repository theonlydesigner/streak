import { createHash } from "node:crypto";

export function hashCredential(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export class DeviceAuth {
  private readonly credentials = new Map<string, { gymId: string; revoked: boolean }>();

  constructor(initialCredential?: string, gymId = "gym-1") {
    if (initialCredential) this.add(initialCredential, gymId);
  }

  add(credential: string, gymId: string): void {
    this.credentials.set(hashCredential(credential), { gymId, revoked: false });
  }

  revoke(credential: string): void {
    const entry = this.credentials.get(hashCredential(credential));
    if (entry) entry.revoked = true;
  }

  authorize(credential: string, gymId: string): boolean {
    const entry = this.credentials.get(hashCredential(credential));
    return Boolean(entry && !entry.revoked && entry.gymId === gymId);
  }
}
