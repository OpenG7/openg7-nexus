import en from '../../../assets/i18n/en.json';
import fr from '../../../assets/i18n/fr.json';

interface LocaleMap {
  readonly [locale: string]: Record<string, unknown>;
}

const locales: LocaleMap = {
  en: en as Record<string, unknown>,
  fr: fr as Record<string, unknown>,
};

const requiredLeafPaths: ReadonlyArray<readonly string[]> = [
  ['auth', 'email'],
  ['auth', 'password'],
  ['auth', 'accessDenied'],
  ['auth', 'profile', 'title'],
  ['auth', 'login', 'title'],
  ['auth', 'login', 'subtitle'],
  ['auth', 'login', 'submit'],
  ['auth', 'register', 'submit'],
  ['auth', 'loginSubtitle'],
  ['auth', 'signup'],
  ['auth', 'or'],
  ['auth', 'continueWithMicrosoft'],
  ['auth', 'continueWithGoogle'],
  ['auth', 'forgotPassword', 'title'],
  ['auth', 'forgotPassword', 'subtitle'],
  ['auth', 'forgotPassword', 'submit'],
  ['auth', 'forgotPassword', 'loading'],
  ['auth', 'forgotPassword', 'success'],
  ['auth', 'forgotPassword', 'link'],
  ['auth', 'forgotPassword', 'backToLogin'],
  ['auth', 'resetPassword', 'title'],
  ['auth', 'resetPassword', 'subtitle'],
  ['auth', 'resetPassword', 'submit'],
  ['auth', 'resetPassword', 'loading'],
  ['auth', 'resetPassword', 'success'],
  ['auth', 'resetPassword', 'tokenLabel'],
  ['auth', 'resetPassword', 'tokenRequired'],
  ['auth', 'resetPassword', 'passwordLabel'],
  ['auth', 'errors', 'passwordResetRequest'],
  ['auth', 'errors', 'resetPassword'],
  ['empty', 'directory', 'title'],
  ['empty', 'directory', 'description'],
  ['empty', 'directory', 'cta'],
  ['feed', 'stream', 'refresh'],
];

function getValue(source: Record<string, unknown>, path: readonly string[]): unknown {
  let current: unknown = source;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

describe('i18n required translations', () => {
  it('exposes the required keys for each supported locale', () => {
    for (const [locale, data] of Object.entries(locales)) {
      const authBlock = getValue(data, ['auth']);

      expect(authBlock).withContext(`Missing auth block in ${locale}`).toBeDefined();
      expect(authBlock).withContext(`auth block in ${locale} should not be null`).not.toBeNull();
      expect(typeof authBlock)
        .withContext(`auth block in ${locale} should be an object`)
        .toBe('object');
      expect(Array.isArray(authBlock))
        .withContext(`auth block in ${locale} should not be an array`)
        .toBeFalse();

      for (const path of requiredLeafPaths) {
        const value = getValue(data, path);
        const dottedPath = path.join('.');

        expect(value).withContext(`Missing ${dottedPath} in ${locale}`).toBeDefined();
        expect(typeof value)
          .withContext(`Expected ${dottedPath} in ${locale} to be a string`)
          .toBe('string');
        expect((value as string).trim().length)
          .withContext(`Expected ${dottedPath} in ${locale} to be non-empty`)
          .toBeGreaterThan(0);
      }
    }
  });
});
