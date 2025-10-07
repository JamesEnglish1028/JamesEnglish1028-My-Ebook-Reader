// Centralized asset exports so components import named assets instead of hard-coded paths.
// This lets the bundler handle fingerprinting and correct paths for production.
import mebooksLogo from './mebooks-logo.svg';
import mebooksLogoLight from './mebooks-logo.light.svg';
import mebooksLogoDark from './mebooks-logo.dark.svg';
import mebooksBook from './mebooks-book.svg';

export { mebooksLogo, mebooksLogoLight, mebooksLogoDark, mebooksBook };
