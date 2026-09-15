// Explicit composition root for map, search, and responsive profile refinements.
// Import order is intentional because later modules refine or intercept behavior
// installed by earlier modules.
import './final-functional-stabilization.mjs';
import './map-mobile-refinement.mjs';
import './map-resume-recovery.mjs';
import './map-profile-first-pass.mjs';
import './mobile-tab-location-refinement.mjs';
import './map-profile-aesthetic-refinement.mjs';
import './search-map-refinement.mjs';
import './map-profile-final-pass.mjs';
import './mobile-direct-venue-profile.mjs';
