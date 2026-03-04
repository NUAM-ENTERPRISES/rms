import { ActionCreatorWithPayload } from "@reduxjs/toolkit";

export interface Notification {
  id: string;
  type: string;
  title?: string;
  message?: string;
  link?: string;
  candidateId?: string;
  data?: {
    candidateId?: string;
    [key: string]: any;
  };
  meta?: {
    candidateId?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export type InvalidateTagsAction = ActionCreatorWithPayload<any, string>;

export interface NotificationHandlerProps {
  notification: Notification;
  dispatch: any;
  invalidateTags: InvalidateTagsAction;
}

export interface SocketEventHandlerProps {
  data: any;
  dispatch: any;
  invalidateTags: InvalidateTagsAction;
}
