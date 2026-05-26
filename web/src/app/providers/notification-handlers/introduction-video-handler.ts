import { NotificationHandlerProps, SocketEventHandlerProps } from "./types";

const INTRODUCTION_VIDEO_NOTIFICATION_TYPES = [
  "introduction_video_rejected",
  "introduction_video_resubmission_requested",
  "introduction_video_resubmitted",
  "introduction_video_verified",
];

const buildIntroductionVideoTags = (notification: NotificationHandlerProps["notification"]) => {
  const candidateId =
    notification.data?.candidateId ||
    notification.candidateId ||
    notification.meta?.candidateId ||
    notification.data?.candidateProject?.candidateId ||
    undefined;

  const projectId =
    notification.data?.projectId ||
    notification.projectId ||
    notification.meta?.projectId ||
    notification.data?.candidateProject?.projectId ||
    undefined;

  const tags: Array<
    | string
    | { type: string; id?: string }
  > = [
    "RecruiterDocuments",
    "DocumentSummary",
    { type: "DocumentVerification" },
  ];

  if (candidateId) {
    tags.push({ type: "IntroductionVideo", id: candidateId });
    tags.push({ type: "DocumentVerification", id: candidateId });
    tags.push({ type: "Candidate", id: candidateId });
  } else {
    tags.push({ type: "IntroductionVideo" });
  }

  if (projectId && candidateId) {
    tags.push({ type: "IntroductionVideo", id: `${candidateId}-${projectId}` });
    tags.push({ type: "Project", id: projectId });
  }

  return tags;
};

export const handleIntroductionVideoNotifications = ({
  notification,
  dispatch,
  invalidateTags,
}: NotificationHandlerProps) => {
  if (!INTRODUCTION_VIDEO_NOTIFICATION_TYPES.includes(notification.type)) {
    return false;
  }

  console.log(
    `[Socket] Handling introduction video notification: ${notification.type}`,
  );

  dispatch(invalidateTags(buildIntroductionVideoTags(notification)));
  return true;
};

export const registerIntroductionVideoSocketEvents = (
  socket: any,
  {
    dispatch,
    invalidateTags,
  }: { dispatch: any; invalidateTags: any },
) => {
  INTRODUCTION_VIDEO_NOTIFICATION_TYPES.forEach((eventName) => {
    socket.on(eventName, (data: any) => {
      handleIntroductionVideoSocketEvents(eventName, {
        data,
        dispatch,
        invalidateTags,
      });
    });
  });
};

export const handleIntroductionVideoSocketEvents = (
  eventName: string,
  { data, dispatch, invalidateTags }: SocketEventHandlerProps,
) => {
  if (!INTRODUCTION_VIDEO_NOTIFICATION_TYPES.includes(eventName)) {
    return false;
  }

  console.log(`[Socket] Direct introduction video event: ${eventName}`, data);

  const tags: Array<string | { type: string; id?: string }> = [
    "RecruiterDocuments",
    "DocumentSummary",
    { type: "DocumentVerification" },
  ];

  if (data?.candidateId) {
    tags.push({ type: "IntroductionVideo", id: data.candidateId });
    tags.push({ type: "DocumentVerification", id: data.candidateId });
  } else {
    tags.push({ type: "IntroductionVideo" });
  }

  if (data?.candidateId && data?.projectId) {
    tags.push({
      type: "IntroductionVideo",
      id: `${data.candidateId}-${data.projectId}`,
    });
  }

  dispatch(invalidateTags(tags));
  return true;
};
