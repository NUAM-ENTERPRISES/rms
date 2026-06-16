import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourierAddressFields } from "../components/CourierAddressFields";
import { ADDRESS_TYPE } from "../constants";
import type { AddressSnapshot } from "../types";

const kochiPreset = {
  address: "Kochi Office, MG Road",
  pincode: "682001",
  phone: "0484-0000000",
};

describe("CourierAddressFields", () => {
  it("applies office preset on mount when type is already selected", async () => {
    function Wrapper() {
      const [snapshot, setSnapshot] = useState<AddressSnapshot>({});

      return (
        <CourierAddressFields
          label="From"
          addressType={ADDRESS_TYPE.KOCHI}
          snapshot={snapshot}
          officePresets={{ kochi: kochiPreset }}
          onAddressTypeChange={vi.fn()}
          onSnapshotChange={setSnapshot}
        />
      );
    }

    render(<Wrapper />);

    expect(await screen.findByText("Kochi Office, MG Road")).toBeInTheDocument();
    expect(screen.getByText("PIN: 682001")).toBeInTheDocument();
  });

  it("applies office preset when presets load after mount", () => {
    const onSnapshotChange = vi.fn();

    const { rerender } = render(
      <CourierAddressFields
        label="To"
        addressType={ADDRESS_TYPE.DELHI}
        snapshot={{}}
        officePresets={{}}
        onAddressTypeChange={vi.fn()}
        onSnapshotChange={onSnapshotChange}
      />,
    );

    expect(onSnapshotChange).not.toHaveBeenCalled();

    rerender(
      <CourierAddressFields
        label="To"
        addressType={ADDRESS_TYPE.DELHI}
        snapshot={{}}
        officePresets={{
          delhi: {
            address: "Delhi Office, Connaught Place",
            pincode: "110001",
          },
        }}
        onAddressTypeChange={vi.fn()}
        onSnapshotChange={onSnapshotChange}
      />,
    );

    expect(onSnapshotChange).toHaveBeenCalledWith({
      address: "Delhi Office, Connaught Place",
      pincode: "110001",
      label: "Delhi Office",
    });
  });
});
