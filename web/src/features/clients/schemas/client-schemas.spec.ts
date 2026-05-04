import { describe, expect, it } from "vitest";
import { clientFormSchema } from "./client-schemas";

describe("clientFormSchema", () => {
  const base = {
    name: "Parent",
    email: "",
    phone: "",
    address: "",
    addressCountryCode: "",
    addressStateId: "",
    pointOfContact: "",
  };

  it("accepts DIRECT_CLIENT without subClient", () => {
    const parsed = clientFormSchema.parse({
      ...base,
      type: "DIRECT_CLIENT",
    });
    expect(parsed.type).toBe("DIRECT_CLIENT");
  });

  it("coerces invalid or empty main type to DIRECT_CLIENT", () => {
    expect(
      clientFormSchema.parse({ ...base, type: "" }).type,
    ).toBe("DIRECT_CLIENT");
    expect(
      clientFormSchema.parse({
        ...base,
        // @ts-expect-error API may deserialize null
        type: null,
      }).type,
    ).toBe("DIRECT_CLIENT");
    expect(
      clientFormSchema.parse({ ...base, type: "UNKNOWN" }).type,
    ).toBe("DIRECT_CLIENT");
    expect(
      clientFormSchema.parse({ ...base, type: "  SUB_AGENT  " }).type,
    ).toBe("SUB_AGENT");
  });

  it("rejects DIRECT_CLIENT when subClient has a name", () => {
    expect(() =>
      clientFormSchema.parse({
        ...base,
        type: "DIRECT_CLIENT",
        subClient: { name: "Child" },
      }),
    ).toThrow();
  });

  it("accepts chosen taxonomy as sub-client type", () => {
    const parsed = clientFormSchema.parse({
      ...base,
      type: "FREELANCE",
      subClient: { name: "Child", type: "SUB_AGENT" },
    });
    expect(parsed.subClient?.type).toBe("SUB_AGENT");
  });

  it("defaults linked sub-client type to DIRECT_CLIENT", () => {
    const parsed = clientFormSchema.parse({
      ...base,
      type: "SUB_AGENT",
      subClient: { name: "Acme Hospital" },
    });
    expect(parsed.subClient?.type).toBe("DIRECT_CLIENT");
  });

  it("accepts SUB_AGENT with empty nested sub-client fields", () => {
    const parsed = clientFormSchema.parse({
      ...base,
      type: "SUB_AGENT",
      subClient: { name: "" },
    });
    expect(parsed.subClient?.name).toBe("");
  });

  it("requires sub-client name when nested details are partially filled", () => {
    expect(() =>
      clientFormSchema.parse({
        ...base,
        type: "SUB_AGENT",
        subClient: { name: "", email: "ops@corp.com" },
      }),
    ).toThrow();

    expect(() =>
      clientFormSchema.parse({
        ...base,
        type: "FREELANCE",
        subClient: { name: "", email: "ops@corp.com" },
      }),
    ).toThrow();

    const ok = clientFormSchema.parse({
      ...base,
      type: "SUB_AGENT",
      subClient: { name: "Emirates" },
    });
    expect(ok.subClient?.name).toBe("Emirates");
  });

  it("allows SUB_AGENT without subClient (parent-only)", () => {
    const parsed = clientFormSchema.parse({
      ...base,
      type: "SUB_AGENT",
      subClient: undefined,
    });
    expect(parsed.subClient).toBeUndefined();
  });
});
