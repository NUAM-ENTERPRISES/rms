import type { NotificationHandlerProps } from "./types";

const COVERAGE_TRANSFER_TYPE = "recruiter_country_coverage_transferred";

/** Socket / outbox sync types that should refresh country coverage lists. */
const COVERAGE_SYNC_TYPES = new Set([
  "RecruiterCountryCoverageTransferred",
  "RecruiterCountryCoverageUpdated",
]);

function invalidateCoverageTransferTags(
  dispatch: NotificationHandlerProps["dispatch"],
  invalidateTags: NotificationHandlerProps["invalidateTags"],
) {
  dispatch(
    invalidateTags([
      "CountryCoverage",
      "User",
      "Candidate",
      "RecruiterAssignment",
      { type: "Candidate", id: "LIST" },
    ]),
  );
}

/** Handle bell notifications for recruiter country coverage transfers. */
export const handleCountryCoverageTransferNotifications = ({
  notification,
  dispatch,
  invalidateTags,
}: NotificationHandlerProps) => {
  const metaType =
    notification.meta &&
    typeof notification.meta === "object" &&
    "type" in notification.meta
      ? (notification.meta as { type?: string }).type
      : undefined;

  const isCoverageTransfer =
    notification.type === COVERAGE_TRANSFER_TYPE ||
    metaType === COVERAGE_TRANSFER_TYPE ||
    (notification.type === "role_notification" &&
      metaType === COVERAGE_TRANSFER_TYPE);

  if (!isCoverageTransfer) {
    return false;
  }

  invalidateCoverageTransferTags(dispatch, invalidateTags);
  return true;
};

/** Handle DataSync for recruiter country coverage transfer / capability updates. */
export const handleCountryCoverageTransferSync = (
  payload: { type?: string; message?: string },
  {
    dispatch,
    invalidateTags,
  }: Pick<NotificationHandlerProps, "dispatch" | "invalidateTags">,
) => {
  if (!payload.type || !COVERAGE_SYNC_TYPES.has(payload.type)) {
    return false;
  }

  invalidateCoverageTransferTags(dispatch, invalidateTags);
  return true;
};
