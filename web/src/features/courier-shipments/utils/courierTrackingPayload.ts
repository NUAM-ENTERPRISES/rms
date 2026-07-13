export function buildDispatchPayload(input: {
  trackingId: string;
  courierPartner: string;
  sentAt: string;
  sentByUserId: string;
  approvedByUserId: string;
}) {
  const trackingId = input.trackingId.trim();
  const courierPartner = input.courierPartner.trim();

  return {
    ...(trackingId ? { trackingId } : {}),
    ...(courierPartner ? { courierPartner } : {}),
    sentAt: input.sentAt,
    sentByUserId: input.sentByUserId,
    approvedByUserId: input.approvedByUserId,
  };
}

export function buildCourierTrackingUpdatePayload(input: {
  trackingId: string;
  courierPartner: string;
}) {
  return {
    trackingId: input.trackingId.trim(),
    courierPartner: input.courierPartner.trim() || undefined,
  };
}
