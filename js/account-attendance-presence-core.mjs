export function publicAttendeePresentation({ attendees = [], displayedTotal = 0, visibleLimit = 5 } = {}) {
  const total = Math.max(0, Math.trunc(Number(displayedTotal) || 0));
  const limit = Math.max(1, Math.trunc(Number(visibleLimit) || 5));
  const publicAttendees = Array.isArray(attendees) ? attendees.slice(0, total) : [];
  const visibleAttendees = publicAttendees.slice(0, limit);

  return Object.freeze({
    total,
    publicAttendees,
    visibleAttendees,
    extra: Math.max(0, total - visibleAttendees.length),
    names: publicAttendees.slice(0, 3)
  });
}
