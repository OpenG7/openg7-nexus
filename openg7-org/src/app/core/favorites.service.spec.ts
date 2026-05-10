import { PLATFORM_ID, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@app/core/auth/auth.service';
import { UserFavoritesApiService } from '@app/core/services/user-favorites-api.service';
import { of } from 'rxjs';

import { FavoritesService } from './favorites.service';

const STORAGE_KEY = 'og7.favorites';

describe('FavoritesService', () => {
  let storage: Record<string, string>;
  let setItemSpy: jasmine.Spy;
  let authState: ReturnType<typeof signal<boolean>>;
  let favoritesApi: jasmine.SpyObj<UserFavoritesApiService>;

  const createService = () => TestBed.inject(FavoritesService);

  beforeEach(() => {
    authState = signal(false);
    favoritesApi = jasmine.createSpyObj<UserFavoritesApiService>('UserFavoritesApiService', [
      'listMine',
      'createMine',
      'deleteMine',
    ]);

    favoritesApi.listMine.and.returnValue(of([]));
    favoritesApi.createMine.and.returnValue(
      of({
        id: '1',
        entityType: 'generic',
        entityId: 'placeholder',
        metadata: null,
        createdAt: null,
        updatedAt: null,
      }),
    );
    favoritesApi.deleteMine.and.returnValue(of({ id: '1', deleted: true }));

    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: computed(() => authState()),
          } as Pick<AuthService, 'isAuthenticated'>,
        },
        { provide: UserFavoritesApiService, useValue: favoritesApi },
      ],
    });

    storage = {};
    spyOn(window.localStorage, 'getItem').and.callFake((key: string) => storage[key] ?? null);
    setItemSpy = spyOn(window.localStorage, 'setItem').and.callFake(
      (key: string, value: string) => {
        storage[key] = value;
      },
    );
  });

  it('should track items count without duplicates', () => {
    const service = createService();

    expect(service.count()).toBe(0);

    service.add('one');
    service.add('one');

    expect(service.count()).toBe(1);
    expect(service.list()).toEqual(['one']);
    expect(favoritesApi.createMine).not.toHaveBeenCalled();
  });

  it('persists list changes to localStorage', () => {
    const service = createService();

    service.add('alpha');
    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(['alpha']));

    setItemSpy.calls.reset();
    service.remove('missing');
    expect(setItemSpy).not.toHaveBeenCalled();

    service.remove('alpha');
    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify([]));

    setItemSpy.calls.reset();
    service.add('beta');
    service.clear();
    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify([]));
  });

  it('restores stored favorites on creation', () => {
    storage[STORAGE_KEY] = JSON.stringify(['one', 'two', 'one']);
    const service = createService();

    expect(service.list()).toEqual(['one', 'two']);
  });

  it('syncs remote favorites and backfills local-only entries when authenticated', () => {
    storage[STORAGE_KEY] = JSON.stringify(['local-only']);
    favoritesApi.listMine.and.returnValue(
      of([
        {
          id: 'remote-1',
          entityType: 'generic',
          entityId: 'remote-only',
          metadata: null,
          createdAt: null,
          updatedAt: null,
        },
      ]),
    );
    favoritesApi.createMine.and.returnValue(
      of({
        id: 'remote-2',
        entityType: 'generic',
        entityId: 'local-only',
        metadata: null,
        createdAt: null,
        updatedAt: null,
      }),
    );

    const service = createService();
    authState.set(true);
    service.refresh();

    expect(favoritesApi.listMine).toHaveBeenCalled();
    expect(service.list()).toEqual(['remote-only', 'local-only']);
    expect(favoritesApi.createMine).toHaveBeenCalledWith({
      entityType: 'generic',
      entityId: 'local-only',
    });
  });

  it('deletes remote favorite when removing a synced entry', () => {
    favoritesApi.listMine.and.returnValue(
      of([
        {
          id: 'remote-99',
          entityType: 'generic',
          entityId: 'alpha',
          metadata: null,
          createdAt: null,
          updatedAt: null,
        },
      ]),
    );
    authState.set(true);
    const service = createService();
    service.refresh();

    service.remove('alpha');

    expect(favoritesApi.deleteMine).toHaveBeenCalledWith('remote-99');
  });
});
