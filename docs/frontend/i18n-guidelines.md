# I18n Guidelines

## Authentication flows

Use the following keys for the login and sign-up experiences. They ensure UI copy stays consistent across the templates (`LoginPage`, `RegisterPage`, and `SocialAuthButtonsComponent`).

| Key                          | Description                                                    |
| ---------------------------- | -------------------------------------------------------------- |
| `auth.login.title`           | Main heading displayed on the login page.                      |
| `auth.loginSubtitle`         | Helper text shown under the login heading.                     |
| `auth.signup`                | Main heading for the registration page and CTA copy.           |
| `auth.or`                    | Divider text rendered between SSO and local credential blocks. |
| `auth.continueWithMicrosoft` | Label for the Microsoft SSO button.                            |
| `auth.continueWithGoogle`    | Label for the Google SSO button.                               |

Retrieve the strings through `TranslateService` (pipe or service) instead of hard-coding literals. Templates should use `| translate` while services/components requiring the value imperatively should call `translate.instant(...)`.

## Empty directory states

A shared empty-state block for the upcoming directory widgets is exposed under `empty.directory.*`:

| Key                           | Description                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| `empty.directory.title`       | Headline displayed when the directory has no entries.        |
| `empty.directory.description` | Supporting text encouraging users to populate the directory. |
| `empty.directory.cta`         | Call-to-action label for the action button.                  |

Keep future directory components wired to these keys to avoid scattering bespoke copy in templates.
