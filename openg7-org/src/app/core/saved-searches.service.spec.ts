import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@app/core/auth/auth.service';
import {
  SavedSearchRecord,
  SavedSearchesApiService,
} from '@app/core/services/saved-searches-api.service';
import { of } from 'rxjs';

import { SavedSearchesService } from './saved-searches.service';

function buildRecord(id: string, patch: Partial<SavedSearchRecord> = {}): SavedSearchRecord {
  return {
    id,
    name: `Search ${id}`,
    scope: 'all',
    filters: {},
    notifyEnabled: false,
    frequency: 'daily',
    lastRunAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  };
}

describe('SavedSearchesService', () => {
  let authState: ReturnType<typeof signal<boolean>>;
  let api: jasmine.SpyObj<SavedSearchesApiService>;

  const createService = () => TestBed.inject(SavedSearchesService);

  beforeEach(() => {
    authState = signal(false);
    api = jasmine.createSpyObj<SavedSearchesApiService>('SavedSearchesApiService', [
      'listMine',
      'createMine',
      'updateMine',
      'deleteMine',
    ]);

    api.listMine.and.returnValue(of([]));
    api.createMine.and.returnValue(of(buildRecord('1')));
    api.updateMine.and.returnValue(
      of(buildRecord('1', { notifyEnabled: true, frequency: 'weekly' })),
    );
    api.deleteMine.and.returnValue(of({ id: '1', deleted: true }));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: computed(() => authState()),
          } as Pick<AuthService, 'isAuthenticated'>,
        },
        { provide: SavedSearchesApiService, useValue: api },
      ],
    });
  });

  it('loads entries from API when authenticated', () => {
    api.listMine.and.returnValue(
      of([
        buildRecord('older', { updatedAt: '2026-01-01T00:00:00.000Z' }),
        buildRecord('newer', { updatedAt: '2026-01-02T00:00:00.000Z' }),
      ]),
    );
    authState.set(true);
    const service = createService();

    service.refresh();

    expect(api.listMine).toHaveBeenCalled();
    expect(service.entries().map((entry) => entry.id)).toEqual(['newer', 'older']);
  });

  it('clears entries without calling API when unauthenticated', () => {
    authState.set(true);
    const service = createService();
    api.listMine.and.returnValue(of([buildRecord('1')]));
    service.refresh();
    expect(service.entries().length).toBe(1);

    api.listMine.calls.reset();
    authState.set(false);
    service.refresh();

    expect(api.listMine).not.toHaveBeenCalled();
    expect(service.entries()).toEqual([]);
  });

  it('creates a new entry', () => {
    authState.set(true);
    const service = createService();

    service.create({
      name: 'Energy watch',
      scope: 'map',
      filters: { query: 'energy' },
      notifyEnabled: true,
      frequency: 'daily',
    });

    expect(api.createMine).toHaveBeenCalled();
    expect(service.entries().length).toBe(1);
    expect(service.entries()[0].id).toBe('1');
  });

  it('updates an existing entry', () => {
    authState.set(true);
    const service = createService();
    api.listMine.and.returnValue(of([buildRecord('1')]));
    service.refresh();

    service.update('1', { notifyEnabled: true, frequency: 'weekly' });

    expect(api.updateMine).toHaveBeenCalledWith('1', { notifyEnabled: true, frequency: 'weekly' });
    expect(service.entries()[0].notifyEnabled).toBeTrue();
    expect(service.entries()[0].frequency).toBe('weekly');
    expect(service.pendingById()['1']).toBeUndefined();
  });

  it('removes an existing entry', () => {
    authState.set(true);
    const service = createService();
    api.listMine.and.returnValue(of([buildRecord('1')]));
    service.refresh();

    service.remove('1');

    expect(api.deleteMine).toHaveBeenCalledWith('1');
    expect(service.entries()).toEqual([]);
  });
});
