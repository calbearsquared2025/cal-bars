// Explicit composition root for the Accounts and My CGB frontend feature family.
// Import order is intentional because these modules install shared account UI
// before later modules enhance, relocate, and observe that canonical shell.
import './account-dialog-interactions.mjs';
import './account-avatar-policy.mjs';
import './accounts-ui.mjs';
import './account-avatar-picker.mjs';
import './my-cgb-native-surface.mjs';
import './account-favorites-navigation.mjs';
import './account-profile-polish.mjs';
import './account-profile-onboarding.mjs';
import './account-attendance.mjs';
import './account-public-community.mjs';
import './account-contributions.mjs';
