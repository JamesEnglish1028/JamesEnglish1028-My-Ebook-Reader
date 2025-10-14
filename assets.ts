// Centralized asset exports so components import named assets instead of hard-coded paths.
// This lets the bundler handle fingerprinting and correct paths for production.
import mebooksBook from './mebooks-book.svg';
import mebooksLogoDark from './mebooks-logo.dark.svg';
import mebooksLogoLight from './mebooks-logo.light.svg';
import mebooksLogo from './mebooks-logo.svg';

export { mebooksLogo, mebooksLogoLight, mebooksLogoDark, mebooksBook };
