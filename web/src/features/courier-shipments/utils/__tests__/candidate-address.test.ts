import { describe, expect, it } from "vitest";
import {
  buildCandidateAddressSnapshot,
  formatCandidatePhone,
  hasCandidateMailingAddress,
} from "../candidate-address";

describe("candidate-address utils", () => {
  it("formats candidate phone with country code", () => {
    expect(
      formatCandidatePhone({ countryCode: "+91", mobileNumber: "9876543210" }),
    ).toBe("+91 9876543210");
  });

  it("builds address snapshot from candidate profile", () => {
    expect(
      buildCandidateAddressSnapshot({
        address: "12 MG Road",
        addressPincode: "682016",
        countryCode: "+91",
        mobileNumber: "9876543210",
        alternatePhone: "9876543211",
      }),
    ).toEqual({
      label: "Candidate",
      address: "12 MG Road",
      pincode: "682016",
      phone: "+91 9876543210",
      altPhone: "9876543211",
    });
  });

  it("detects missing mailing address", () => {
    expect(hasCandidateMailingAddress({ address: "", addressPincode: "" })).toBe(
      false,
    );
    expect(
      hasCandidateMailingAddress({ address: "12 MG Road", addressPincode: "" }),
    ).toBe(true);
  });
});
