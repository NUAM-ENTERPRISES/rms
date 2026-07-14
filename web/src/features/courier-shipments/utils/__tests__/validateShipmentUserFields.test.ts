import { describe, expect, it } from "vitest";
import { DELIVERY_MODE } from "../../constants";
import {
  firstShipmentUserFieldError,
  validateShipmentUserFields,
} from "../validateShipmentUserFields";

describe("validateShipmentUserFields", () => {
  it("requires both users for courier dispatch", () => {
    const result = validateShipmentUserFields("", "", DELIVERY_MODE.COURIER);

    expect(result.valid).toBe(false);
    expect(result.errors.sentByUserId).toBe("Select who sent");
    expect(result.errors.approvedByUserId).toBe("Select who approved");
  });

  it("uses handover copy for direct delivery", () => {
    const result = validateShipmentUserFields(
      "",
      "u2",
      DELIVERY_MODE.DIRECT,
    );

    expect(result.errors.sentByUserId).toBe("Select who handed over");
    expect(result.errors.approvedByUserId).toBeUndefined();
  });

  it("passes when both users are selected", () => {
    const result = validateShipmentUserFields(
      "u1",
      "u2",
      DELIVERY_MODE.COURIER,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("returns the first field error message", () => {
    expect(
      firstShipmentUserFieldError({
        sentByUserId: "Select who sent",
        approvedByUserId: "Select who approved",
      }),
    ).toBe("Select who sent");
  });
});
