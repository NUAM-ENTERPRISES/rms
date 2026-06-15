import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ADDRESS_TYPE,
  ADDRESS_TYPE_LABELS,
  type AddressType,
} from "../constants";
import type { AddressSnapshot } from "../types";

const PRESET_TYPES: AddressType[] = [
  ADDRESS_TYPE.KOCHI,
  ADDRESS_TYPE.DELHI,
  ADDRESS_TYPE.CLIENT,
  ADDRESS_TYPE.CANDIDATE,
  ADDRESS_TYPE.OTHER,
];

interface CourierAddressFieldsProps {
  label: string;
  addressType: AddressType;
  snapshot: AddressSnapshot;
  officePresets?: Record<string, AddressSnapshot & { label?: string }>;
  onAddressTypeChange: (type: AddressType) => void;
  onSnapshotChange: (snapshot: AddressSnapshot) => void;
  disabled?: boolean;
}

export function CourierAddressFields({
  label,
  addressType,
  snapshot,
  officePresets = {},
  onAddressTypeChange,
  onSnapshotChange,
  disabled,
}: CourierAddressFieldsProps) {
  const prevType = useRef(addressType);

  useEffect(() => {
    if (prevType.current === addressType) return;
    prevType.current = addressType;
    if (addressType === ADDRESS_TYPE.KOCHI && officePresets.kochi) {
      onSnapshotChange({
        ...officePresets.kochi,
        label: "Kochi Office",
      });
    } else if (addressType === ADDRESS_TYPE.DELHI && officePresets.delhi) {
      onSnapshotChange({
        ...officePresets.delhi,
        label: "Delhi Office",
      });
    }
  }, [addressType, officePresets, onSnapshotChange]);

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {PRESET_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onAddressTypeChange(type)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              addressType === type
                ? "border-teal-400 bg-teal-50 text-teal-800"
                : "border-border bg-background hover:bg-muted",
            )}
            aria-pressed={addressType === type}
          >
            {ADDRESS_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {addressType !== ADDRESS_TYPE.OTHER &&
        addressType !== ADDRESS_TYPE.CLIENT &&
        addressType !== ADDRESS_TYPE.CANDIDATE &&
        snapshot.address && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{snapshot.label}</p>
                <p className="text-muted-foreground">{snapshot.address}</p>
                {snapshot.pincode && (
                  <p className="text-muted-foreground text-xs mt-1">
                    PIN: {snapshot.pincode}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      {(addressType === ADDRESS_TYPE.OTHER ||
        addressType === ADDRESS_TYPE.CLIENT ||
        addressType === ADDRESS_TYPE.CANDIDATE) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {addressType === ADDRESS_TYPE.CANDIDATE &&
          !snapshot.address?.trim() &&
          !snapshot.pincode?.trim() ? (
            <p className="sm:col-span-2 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No address on candidate profile. Enter details below; they will be
              saved to the candidate when you create this leg.
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Label htmlFor={`${label}-address`}>Street address</Label>
            <Textarea
              id={`${label}-address`}
              value={snapshot.address ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onSnapshotChange({ ...snapshot, address: e.target.value })
              }
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor={`${label}-pincode`}>Pincode</Label>
            <Input
              id={`${label}-pincode`}
              value={snapshot.pincode ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onSnapshotChange({ ...snapshot, pincode: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor={`${label}-phone`}>Phone</Label>
            <Input
              id={`${label}-phone`}
              value={snapshot.phone ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onSnapshotChange({ ...snapshot, phone: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor={`${label}-alt`}>Alt. phone</Label>
            <Input
              id={`${label}-alt`}
              value={snapshot.altPhone ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onSnapshotChange({ ...snapshot, altPhone: e.target.value })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
