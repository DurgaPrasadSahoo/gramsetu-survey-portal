import { SURVEY_STATUS } from '../constants/surveyStatus';

// Mirrors the authorization rules enforced server-side in server/src/routes/surveys.js
// (assertCanModify) — this only controls what the UI shows/enables; the server is the
// actual source of truth and re-checks everything independently.
export function getSurveyPermissions(survey, user) {
  if (!survey || !user) {
    return { canView: false, canRequestEdit: false, canEdit: false, canDelete: false };
  }

  if (user.role === 'developer') {
    return { canView: true, canRequestEdit: false, canEdit: true, canDelete: true };
  }

  const isOwner = survey.created_by === user.id;
  const isApproved = survey.status === SURVEY_STATUS.REQUEST_APPROVED;

  return {
    canView: true,
    canRequestEdit: isOwner && survey.status === SURVEY_STATUS.FINAL,
    canEdit: isOwner && isApproved,
    canDelete: isOwner && isApproved,
  };
}
