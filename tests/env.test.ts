import { afterEach, describe, expect, it, vi } from "vitest";

const VALID = {
  DATABASE_URL: "postgresql://u:p@ep-x-pooler.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  APP_PASSWORD: "test-password",
  AUTH_SECRET: "test-secret-0123456789abcdefghijklmnop",
};

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) vi.stubEnv(k, undefined as unknown as string);
    else vi.stubEnv(k, v);
  }
  return import("@/lib/env");
}

afterEach(() => vi.unstubAllEnvs());

describe("getEnv", () => {
  it("accepts plain values", async () => {
    const { getEnv } = await load(VALID);
    expect(getEnv()).toEqual(VALID);
  });

  it("strips quotes and spaces pasted into hosting dashboards", async () => {
    const { getEnv, readAuthSecret } = await load({
      DATABASE_URL: `"${VALID.DATABASE_URL}"`,
      APP_PASSWORD: ` 'test-password' `,
      AUTH_SECRET: `"${VALID.AUTH_SECRET}"\n`,
    });
    expect(getEnv()).toEqual(VALID);
    expect(readAuthSecret()).toBe(VALID.AUTH_SECRET);
  });

  it("names the bad variables without leaking values", async () => {
    const { getEnv, EnvError } = await load({ ...VALID, DATABASE_URL: "nope", AUTH_SECRET: "short" });
    try {
      getEnv();
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError);
      const msg = (e as Error).message;
      expect(msg).toContain("DATABASE_URL");
      expect(msg).toContain("AUTH_SECRET");
      expect(msg).not.toContain("short");
    }
  });
});
