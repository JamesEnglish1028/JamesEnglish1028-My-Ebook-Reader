// Centralized asset exports so components import named assets instead of hard-coded paths.
// This lets the bundler handle fingerprinting and correct paths for production.
import mebooksBook from './MeBooks_transparent_white_removed.png';
import mebooksLogo from './MeBooks_logo.svg';
import mebooksLockupStackedDark from './MeBooks_lockup_stacked_dark.svg';

export { mebooksLogo, mebooksBook, mebooksLockupStackedDark };
