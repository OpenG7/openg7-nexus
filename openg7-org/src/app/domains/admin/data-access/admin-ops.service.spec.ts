/// <reference types="jasmine" />

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@app/core/config/environment.tokens';
import { RuntimeConfigService } from '@app/core/config/runtime-config.service';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';

import { AdminOpsService } from './admin-ops.service';

describe('AdminOpsService', () => {
  let service: AdminOpsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminOpsService,
        { provide: API_URL, useValue: 'https://cms.local' },
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: RuntimeConfigService,
          useValue: {
            apiUrl: () => 'https://cms.local',
            apiWithCredentials: () => false,
          },
        },
      ],
    });

    service = TestBed.inject(AdminOpsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts Codex workflow dispatches to the admin ops endpoint with silent error handling', () => {
    service
      .dispatchCodexWorkflow({
        task: 'Fix the login empty state and add a focused test.',
        scope: 'openg7-org',
        baseBranch: 'main',
        draftPr: true,
        model: 'gpt-5.4',
        effort: 'medium',
      })
      .subscribe((response) => {
        expect(response.queued).toBeTrue();
        expect(response.workflow).toBe('codex-pr.yml');
      });

    const request = httpMock.expectOne('https://cms.local/api/admin/ops/codex/dispatch');
    expect(request.request.method).toBe('POST');
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    expect(request.request.body).toEqual({
      task: 'Fix the login empty state and add a focused test.',
      scope: 'openg7-org',
      baseBranch: 'main',
      draftPr: true,
      model: 'gpt-5.4',
      effort: 'medium',
    });

    request.flush({
      data: {
        queued: true,
        provider: 'github-actions',
        owner: 'OpenG7',
        repo: 'openg7-platform',
        workflow: 'codex-pr.yml',
        ref: 'main',
        requestedAt: '2026-04-26T00:00:00.000Z',
        request: {
          scope: 'openg7-org',
          baseBranch: 'main',
          draftPr: true,
          model: 'gpt-5.4',
          effort: 'medium',
          taskLength: 49,
        },
      },
    });
  });
});
