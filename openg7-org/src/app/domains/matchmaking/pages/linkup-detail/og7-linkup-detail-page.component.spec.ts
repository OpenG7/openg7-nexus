import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LinkupDataService } from '@app/domains/matchmaking/data-access/linkup-data.service';
import { LinkupRecord } from '@app/domains/matchmaking/data-access/linkup.models';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Og7LinkupDetailPageComponent } from './og7-linkup-detail-page.component';

function buildLinkup(overrides: Partial<LinkupRecord> = {}): LinkupRecord {
  return {
    id: '41',
    reference: 'OG7-LINKUP-000041',
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-02T00:00:00.000Z',
    status: 'inDiscussion',
    tradeMode: 'export',
    companyA: {
      id: '201',
      name: 'Hydro Quebec Transition',
      province: 'provinces.QC',
      sector: 'sectors.energy',
      channel: 'pages.linkups.channels.platform',
    },
    companyB: {
      id: '301',
      name: 'Prairie Electrolyzers Inc.',
      province: 'provinces.AB',
      sector: 'sectors.energy',
      channel: 'pages.linkups.channels.platform',
    },
    primarySector: 'sectors.energy',
    summary: 'We should schedule a formal introduction for this corridor next week.',
    timeline: [
      {
        id: 'timeline-1',
        date: '2030-01-01T00:00:00.000Z',
        summary: 'pages.linkups.timeline.stage.intro',
        channel: 'pages.linkups.channels.platform',
        author: 'Hydro Quebec Transition',
      },
    ],
    notes: [],
    ...overrides,
  };
}

describe('Og7LinkupDetailPageComponent', () => {
  let linkups: jasmine.SpyObj<LinkupDataService>;

  beforeEach(async () => {
    linkups = jasmine.createSpyObj<LinkupDataService>('LinkupDataService', [
      'loadById',
      'updateStatus',
      'saveNote',
    ]);

    await TestBed.configureTestingModule({
      imports: [Og7LinkupDetailPageComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '41' }),
            },
            paramMap: of(convertToParamMap({ id: '41' })),
          },
        },
        { provide: LinkupDataService, useValue: linkups },
      ],
    }).compileComponents();
  });

  it('renders the bilateral linkup detail returned by the service', async () => {
    linkups.loadById.and.resolveTo(buildLinkup());

    const fixture = TestBed.createComponent(Og7LinkupDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(linkups.loadById).toHaveBeenCalledWith('41');
    expect(content).toContain('Hydro Quebec Transition');
    expect(content).toContain('Prairie Electrolyzers Inc.');
  });

  it('shows the not found state when the service returns null', async () => {
    linkups.loadById.and.resolveTo(null);

    const fixture = TestBed.createComponent(Og7LinkupDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('pages.linkups.detail.notFound.title');
  });

  it('updates the current status from the detail page', async () => {
    linkups.loadById.and.resolveTo(buildLinkup());
    linkups.updateStatus.and.resolveTo(
      buildLinkup({
        status: 'completed',
        updatedAt: '2030-01-03T00:00:00.000Z',
      })
    );

    const fixture = TestBed.createComponent(Og7LinkupDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      onStatusDraftChanged(status: LinkupRecord['status']): void;
      onSaveStatus(): Promise<void>;
    };

    component.onStatusDraftChanged('completed');
    await component.onSaveStatus();
    fixture.detectChanges();

    expect(linkups.updateStatus).toHaveBeenCalledWith('41', 'completed');
    expect((fixture.nativeElement.textContent as string)).toContain('pages.linkups.status.completed');
  });

  it('saves a new internal note from the detail page', async () => {
    linkups.loadById.and.resolveTo(buildLinkup());
    linkups.saveNote.and.resolveTo(
      buildLinkup({
        notes: [
          {
            id: 'note-2',
            date: '2030-01-03T00:00:00.000Z',
            author: 'pages.linkups.detail.systemAuthor',
            content: 'Partner confirmed the revised meeting slot.',
          },
        ],
      })
    );

    const fixture = TestBed.createComponent(Og7LinkupDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      onNoteDraftChanged(note: string): void;
      onSaveNote(): Promise<void>;
    };

    component.onNoteDraftChanged('Partner confirmed the revised meeting slot.');
    await component.onSaveNote();
    fixture.detectChanges();

    expect(linkups.saveNote).toHaveBeenCalledWith(
      '41',
      'inDiscussion',
      'Partner confirmed the revised meeting slot.'
    );
    expect((fixture.nativeElement.textContent as string)).toContain(
      'Partner confirmed the revised meeting slot.'
    );
  });

  it('shows a load error and retries the request from the detail page', async () => {
    linkups.loadById.and.rejectWith(new Error('network down'));

    const fixture = TestBed.createComponent(Og7LinkupDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent as string).toContain('pages.linkups.errors.title');

    linkups.loadById.and.resolveTo(buildLinkup({ id: '42', reference: 'OG7-LINKUP-000042' }));

    const retryButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(
      (button: HTMLButtonElement) => (button.textContent as string).includes('pages.linkups.actions.retry')
    ) as HTMLButtonElement;

    retryButton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(linkups.loadById).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent as string).toContain('OG7-LINKUP-000042');
  });

  it('caps note drafts locally and blocks blank note submissions', async () => {
    linkups.loadById.and.resolveTo(buildLinkup());

    const fixture = TestBed.createComponent(Og7LinkupDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      noteMaxLength: number;
      noteDraft(): string;
      canSaveNote(): boolean;
      onNoteDraftChanged(note: string): void;
      onSaveNote(): Promise<void>;
    };

    component.onNoteDraftChanged('x'.repeat(component.noteMaxLength + 24));
    fixture.detectChanges();

    expect(component.noteDraft().length).toBe(component.noteMaxLength);

    component.onNoteDraftChanged('   ');
    await component.onSaveNote();

    expect(component.canSaveNote()).toBeFalse();
    expect(linkups.saveNote).not.toHaveBeenCalled();
  });
});
