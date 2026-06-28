import { Navigate, useLocation } from "react-router-dom";
import {
  INTERVIEWS_SHORTLIST_PENDING_FILTER,
  buildInterviewsPagePath,
  parseSearchFromLink,
} from "../utils/interviewsListNavigation";

export default function InterviewsShortlistPendingRedirect() {
  const location = useLocation();
  const search =
    parseSearchFromLink(`/interviews/shortlist-pending${location.search}`) ??
    undefined;

  return (
    <Navigate
      to={buildInterviewsPagePath(INTERVIEWS_SHORTLIST_PENDING_FILTER, search)}
      replace
    />
  );
}
