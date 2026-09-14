export function publicAttendeePresentation({ attendees = [], displayedTotal = 0, namedLimit = 2 } = {}) {
  const total = Math.max(0, Math.trunc(Number(displayedTotal) || 0));
  const limit = Math.max(0, Math.trunc(Number(namedLimit) || 0));
  const publicAttendees = Array.isArray(attendees) ? attendees.slice(0, total) : [];
  const namedAttendees = publicAttendees.slice(0, limit);
  const avatarOnlyAttendees = publicAttendees.slice(namedAttendees.length);

  return Object.freeze({
    total,
    publicAttendees,
    namedAttendees,
    avatarOnlyAttendees,
    anonymousCount: Math.max(0, total - publicAttendees.length)
  });
}
