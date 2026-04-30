/// <reference types="jasmine" />

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@app/core/config/environment.tokens';
import { RuntimeConfigService } from '@app/core/config/runtime-config.service';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';

import { AdminQualityMissionDecisionsService } from './admin-quality-mission-decisions.service';

describe('AdminQualityMissionDecisionsService', () => {
  let service: AdminQualityMissionDecisionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminQualityMissionDecisionsService,
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

    service = TestBed.inject(AdminQualityMissionDecisionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads mission decisions from the admin quality endpoint', () => {
    service.loadDecisions().subscribe((snapshot) => {
      expect(snapshot.decisions.length).toBe(1);
      expect(snapshot.decisions[0]?.recommendationId).toBe('advanced-discovery::core');
    });

    const request = httpMock.expectOne('https://cms.local/api/admin/quality/mission-decisions');
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    request.flush({
      data: {
        generatedAt: '2026-04-30T00:00:00.000Z',
        decisions: [
          {
            recommendationId: 'advanced-discovery::core',
            entryId: 'advanced-discovery',
            kind: 'core',
            status: 'approved',
            title: 'Etendre la preuve QA',
            message: 'Mission approuvee.',
            operatorPrompt: 'Objectif: etendre la preuve.',
            metadata: {},
            decidedByUserId: '1',
            createdAt: '2026-04-30T00:00:00.000Z',
            updatedAt: '2026-04-30T00:00:00.000Z',
          },
        ],
      },
    });
  });

  it('saves and deletes a mission decision silently', () => {
    service
      .saveDecision({
        recommendationId: 'advanced-discovery::core',
        entryId: 'advanced-discovery',
        kind: 'core',
        status: 'in-progress',
        title: 'Etendre la preuve QA',
        message: 'Mission deleguee.',
        operatorPrompt: 'Objectif: etendre la preuve.',
        metadata: { targetFiles: ['openg7-org/e2e/feed.spec.ts'] },
      })
      .subscribe((decision) => {
        expect(decision.status).toBe('in-progress');
      });

    const saveRequest = httpMock.expectOne(
      'https://cms.local/api/admin/quality/mission-decisions/advanced-discovery%3A%3Acore',
    );
    expect(saveRequest.request.method).toBe('PUT');
    expect(saveRequest.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    expect(saveRequest.request.body).toEqual(
      jasmine.objectContaining({
        recommendationId: 'advanced-discovery::core',
        status: 'in-progress',
      }),
    );
    saveRequest.flush({
      data: {
        ...saveRequest.request.body,
        decidedByUserId: '1',
        createdAt: '2026-04-30T00:00:00.000Z',
        updatedAt: '2026-04-30T00:00:00.000Z',
      },
    });

    service.deleteDecision('advanced-discovery::core').subscribe((result) => {
      expect(result.deleted).toBeTrue();
    });

    const deleteRequest = httpMock.expectOne(
      'https://cms.local/api/admin/quality/mission-decisions/advanced-discovery%3A%3Acore',
    );
    expect(deleteRequest.request.method).toBe('DELETE');
    expect(deleteRequest.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    deleteRequest.flush({
      data: {
        recommendationId: 'advanced-discovery::core',
        deleted: true,
      },
    });
  });
});
