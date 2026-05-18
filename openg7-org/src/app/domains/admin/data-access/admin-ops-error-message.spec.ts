import { HttpErrorResponse } from '@angular/common/http';

import { resolveAdminOpsErrorMessage } from './admin-ops-error-message';

describe('resolveAdminOpsErrorMessage', () => {
  it('extracts Strapi error messages from HTTP payloads', () => {
    const error = new HttpErrorResponse({
      status: 503,
      error: {
        data: null,
        error: {
          status: 503,
          name: 'ServiceUnavailableError',
          message: 'owner.ops.ai.disabled',
        },
      },
    });

    expect(resolveAdminOpsErrorMessage(error, 'fallback')).toBe('owner.ops.ai.disabled');
  });

  it('keeps the admin access message for forbidden HTTP responses', () => {
    const error = new HttpErrorResponse({
      status: 403,
      error: {
        error: {
          message: 'Forbidden',
        },
      },
    });

    expect(resolveAdminOpsErrorMessage(error, 'fallback')).toBe(
      'Access denied. This dashboard is restricted to owner/admin accounts.',
    );
  });

  it('extracts plain object and Error messages before falling back', () => {
    expect(
      resolveAdminOpsErrorMessage({ error: { message: 'owner.ops.ai.base_branch.invalid' } }, ''),
    ).toBe('owner.ops.ai.base_branch.invalid');

    expect(resolveAdminOpsErrorMessage(new Error('GitHub workflow dispatch failed'), '')).toBe(
      'GitHub workflow dispatch failed',
    );

    expect(resolveAdminOpsErrorMessage(null, 'Codex dispatch failed')).toBe(
      'Codex dispatch failed',
    );
  });
});
