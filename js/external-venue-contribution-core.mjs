import {
  PUBLIC_VENUE_FIELDS,
  responseContainsPrivateExternalFields
} from './external-venue-core.mjs';

const ACCEPTED_RESPONSE_VENUE_FIELDS = new Set([
  ...PUBLIC_VENUE_FIELDS,
  'verification_status'
]);

export function validateAddExternalVenueResponse(response) {
  if (!response || typeof response !== 'object' || responseContainsPrivateExternalFields(response)) return false;
  if (response.ok !== true || response.action !== 'addExternalVenue') return false;
  if (!response.venue || typeof response.venue !== 'object') return false;
  if (Object.keys(response.venue).some((key) => !ACCEPTED_RESPONSE_VENUE_FIELDS.has(key))) return false;
  if (typeof response.venue.venue_id !== 'string' || typeof response.venue.slug !== 'string') return false;
  if (response.venue.venue_type !== 'community_location' && response.venue.venue_type !== 'cal_bar') return false;
  if ('selection' in response || 'browserId' in response || 'browser_id' in response) return false;
  return true;
}
