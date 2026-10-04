import { afterEach, describe, expect, it } from "vitest";
import { clientIp } from "@/server/security/client-ip";

const h = (o: Record<string, string>) => new Headers(o);

afterEach(() => {
  delete process.env.VERCEL;
});

describe("clientIp", () => {
  it("Vercel: memakai x-real-ip / x-forwarded-for, mengabaikan cf-connecting-ip palsu", () => {
    process.env.VERCEL = "1";
    expect(clientIp(h({ "cf-connecting-ip": "6.6.6.6", "x-real-ip": "1.1.1.1" }))).toBe("1.1.1.1");
    expect(clientIp(h({ "cf-connecting-ip": "6.6.6.6", "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
  });
  it("Cloudflare: memakai cf-connecting-ip, mengabaikan x-forwarded-for palsu", () => {
    expect(clientIp(h({ "cf-connecting-ip": "4.4.4.4", "x-forwarded-for": "6.6.6.6" }))).toBe("4.4.4.4");
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6" }))).toBe("unknown");
  });
});
