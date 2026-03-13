import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { FeedRealtimeConnectionState } from '../models/feed.models';
import { FeedRealtimeService } from '../services/feed-realtime.service';

import { Og7FeedStreamComponent } from './og7-feed-stream.component';

class FeedRealtimeServiceMock {
  readonly onboardingSeen = signal(true).asReadonly();
}

class StoreMock {
  private readonly provincesSig = signal([]);
  private readonly sectorsSig = signal([]);
  private selectCallCount = 0;

  readonly selectSignal = jasmine.createSpy('selectSignal').and.callFake(() => {
    this.selectCallCount += 1;
    return this.selectCallCount === 1 ? this.provincesSig.asReadonly() : this.sectorsSig.asReadonly();
  });
}

function createConnectionState({
  connected,
  reconnecting = false,
  error = null,
}: {
  connected: boolean;
  reconnecting?: boolean;
  error?: string | null;
}): FeedRealtimeConnectionState {
  return {
    connected: signal(connected).asReadonly(),
    reconnecting: signal(reconnecting).asReadonly(),
    error: signal<string | null>(error).asReadonly(),
  };
}

describe('Og7FeedStreamComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Og7FeedStreamComponent, TranslateModule.forRoot()],
      providers: [
        { provide: FeedRealtimeService, useClass: FeedRealtimeServiceMock },
        { provide: Store, useClass: StoreMock },
      ],
    })
      .overrideComponent(Og7FeedStreamComponent, {
        set: {
          imports: [CommonModule, TranslateModule],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();
  });

  it('hides the retry button when the realtime connection is healthy', () => {
    const fixture = TestBed.createComponent(Og7FeedStreamComponent);
    fixture.componentRef.setInput('connectionState', createConnectionState({ connected: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.feed-stream__status button')).toBeNull();
  });

  it('shows the retry button when the realtime connection is degraded', () => {
    const fixture = TestBed.createComponent(Og7FeedStreamComponent);
    fixture.componentRef.setInput('connectionState', createConnectionState({ connected: true, error: 'Lag detected' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.feed-stream__status button')).not.toBeNull();
  });

  it('shows the retry button when the realtime connection is offline', () => {
    const fixture = TestBed.createComponent(Og7FeedStreamComponent);
    fixture.componentRef.setInput('connectionState', createConnectionState({ connected: false }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.feed-stream__status button')).not.toBeNull();
  });
});
