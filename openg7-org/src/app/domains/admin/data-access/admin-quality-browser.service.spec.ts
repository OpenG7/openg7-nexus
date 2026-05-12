import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminQualityBrowserService } from '@openg7/admin-quality';

const STORAGE_KEY = 'og7.test.admin-quality-browser';

describe('AdminQualityBrowserService', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
  });

  it('reads, writes, and removes local storage values in the browser', () => {
    const service = setup('browser');

    expect(service.isBrowser).toBeTrue();
    expect(service.readStorageItem(STORAGE_KEY)).toBeNull();
    expect(service.writeStorageItem(STORAGE_KEY, 'mission-ready')).toBeTrue();
    expect(service.readStorageItem(STORAGE_KEY)).toBe('mission-ready');

    service.removeStorageItem(STORAGE_KEY);

    expect(service.readStorageItem(STORAGE_KEY)).toBeNull();
  });

  it('delegates confirmation prompts to the browser when available', () => {
    const service = setup('browser');
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);

    expect(service.confirm('Launch AI dispatch?', true)).toBeFalse();
    expect(confirmSpy).toHaveBeenCalledOnceWith('Launch AI dispatch?');
  });

  it('falls back safely when browser APIs are unavailable', async () => {
    const service = setup('server');

    expect(service.isBrowser).toBeFalse();
    expect(service.readStorageItem(STORAGE_KEY)).toBeNull();
    expect(service.writeStorageItem(STORAGE_KEY, 'mission-ready')).toBeFalse();
    expect(service.confirm('Launch AI dispatch?', false)).toBeFalse();
    expect(service.cancelSpeech()).toBeFalse();
    expect(() => service.speak('Briefing')).toThrowError('speech_unavailable');
    await expectAsync(service.copyText('Briefing')).toBeRejectedWithError('copy_unavailable');
  });
});

function setup(platformId: 'browser' | 'server'): AdminQualityBrowserService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: PLATFORM_ID, useValue: platformId }],
  });

  return TestBed.inject(AdminQualityBrowserService);
}
