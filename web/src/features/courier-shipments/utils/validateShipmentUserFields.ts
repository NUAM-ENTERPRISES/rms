import type { DeliveryMode } from "../constants";
import { DELIVERY_MODE } from "../constants";

export type ShipmentUserFieldErrors = {
  sentByUserId?: string;
  approvedByUserId?: string;
};

export function validateShipmentUserFields(
  sentByUserId: string,
  approvedByUserId: string,
  deliveryMode: DeliveryMode,
): { errors: ShipmentUserFieldErrors; valid: boolean } {
  const errors: ShipmentUserFieldErrors = {};
  const sentMessage =
    deliveryMode === DELIVERY_MODE.COURIER
      ? "Select who sent"
      : "Select who handed over";

  if (!sentByUserId.trim()) {
    errors.sentByUserId = sentMessage;
  }
  if (!approvedByUserId.trim()) {
    errors.approvedByUserId = "Select who approved";
  }

  return {
    errors,
    valid: !errors.sentByUserId && !errors.approvedByUserId,
  };
}

export function firstShipmentUserFieldError(
  errors: ShipmentUserFieldErrors,
): string | undefined {
  return errors.sentByUserId ?? errors.approvedByUserId;
}
