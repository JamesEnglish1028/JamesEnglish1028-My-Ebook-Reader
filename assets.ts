// Centralized asset exports so components import named assets instead of hard-coded paths.
// This lets the bundler handle fingerprinting and correct paths for production.
import mebooksLockupStackedDark from './MeBooks_lockup_stacked_dark.svg';
import mebooksLogo from './MeBooks_logo.svg';
import mebooksBook from './MeBooks_transparent_white_removed.png';

export { mebooksBook, mebooksLockupStackedDark, mebooksLogo };
