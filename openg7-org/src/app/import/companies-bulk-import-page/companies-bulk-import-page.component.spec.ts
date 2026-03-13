import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import type {
  CompaniesBulkImportErrorEntry,
  CompaniesBulkImportReportResponse,
  CompaniesBulkImportStatusResponse,
} from '../data-access/companies-bulk-import.service';

import { CompaniesBulkImportPageComponent } from './companies-bulk-import-page.component';
import { CompaniesBulkImportFacade } from './companies-bulk-import.facade';

type FacadeStub = Pick<
  CompaniesBulkImportFacade,
  | 'submitting'
  | 'cancelling'
  | 'status'
  | 'report'
  | 'errorsPreview'
  | 'streamConnected'
  | 'error'
  | 'startFromFile'
  | 'startFromJson'
  | 'cancelCurrentJob'
  | 'reset'
>;

describe('CompaniesBulkImportPageComponent', () => {
  const facadeStub: FacadeStub = {
    submitting: signal(false),
    cancelling: signal(false),
    status: signal<CompaniesBulkImportStatusResponse | null>(null),
    report: signal<CompaniesBulkImportReportResponse | null>(null),
    errorsPreview: signal<ReadonlyArray<CompaniesBulkImportErrorEntry>>([]),
    streamConnected: signal(false),
    error: signal<string | null>(null),
    startFromFile: jasmine.createSpy('startFromFile').and.resolveTo(),
    startFromJson: jasmine.createSpy('startFromJson').and.resolveTo(),
    cancelCurrentJob: jasmine.createSpy('cancelCurrentJob').and.resolveTo(),
    reset: jasmine.createSpy('reset'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompaniesBulkImportPageComponent, TranslateModule.forRoot()],
    })
      .overrideComponent(CompaniesBulkImportPageComponent, {
        set: {
          providers: [{ provide: CompaniesBulkImportFacade, useValue: facadeStub }],
        },
      })
      .compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'fr',
      {
        importCompaniesBulkPage: {
          title: 'Importation asynchrone en lot des entreprises',
          subtitle: "Creez un job d'import asynchrone a partir d'un fichier CSV/JSONL ou d'un payload JSON et suivez la progression en temps reel.",
          badges: {
            formats: 'CSV, JSONL, NDJSON',
            liveTracking: 'Suivi en direct',
          },
          fields: {
            mode: "Mode d'execution",
            dryRun: 'Simulation (aucune ecriture)',
            file: 'Televerser un fichier (.csv, .jsonl)',
            jsonFallback: 'Payload JSON de secours',
          },
          modes: {
            upsert: 'Upsert',
            validateOnly: 'Validation uniquement',
          },
          fileHint: 'Si un fichier est selectionne, il est prioritaire sur le payload JSON ci-dessous.',
          jsonPlaceholder: 'Collez ici un tableau JSON d entreprises...',
          selectedFile: 'Fichier selectionne : {{ file }}',
          actions: {
            start: "Demarrer l'import asynchrone",
            starting: 'Demarrage...',
            cancel: 'Annuler le job',
            cancelling: 'Annulation...',
            reset: 'Reinitialiser',
          },
          states: {
            queued: 'En file',
            running: 'En cours',
            completed: 'Termine',
            failed: 'Echec',
            cancelled: 'Annule',
          },
          progress: {
            title: 'Progression du job',
            phase: 'Phase courante : {{ phase }}',
            total: 'Lignes totales',
            processed: 'Traitees',
            ok: 'Reussies',
            failed: 'Echouees',
          },
          errors: {
            title: 'Dernieres erreurs de lignes',
          },
          report: {
            title: 'Rapport final',
            summary: '{{ processed }} ligne(s) traitee(s) - {{ ok }} reussie(s) - {{ failed }} en echec.',
            downloadCsv: 'Telecharger les erreurs CSV',
            downloadJson: 'Telecharger les erreurs JSON',
          },
        },
      },
      true
    );
    translate.use('fr');
  });

  it('renders the title and subtitle inside a high-contrast header card', () => {
    const fixture = TestBed.createComponent(CompaniesBulkImportPageComponent);
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('[data-og7-id="bulk-import-header"]') as HTMLElement;
    const title = header.querySelector('h1') as HTMLElement;
    const subtitle = header.querySelector('p') as HTMLElement;

    expect(header).toBeTruthy();
    expect(header.className).toContain('bg-white/90');
    expect(title.textContent).toContain('Importation asynchrone en lot des entreprises');
    expect(title.className).toContain('text-slate-900');
    expect(subtitle.textContent).toContain("Creez un job d'import asynchrone");
    expect(subtitle.className).toContain('text-slate-600');
  });

  it('uses the standardized primary CTA styling for starting an import', () => {
    const fixture = TestBed.createComponent(CompaniesBulkImportPageComponent);
    fixture.detectChanges();

    const startButton = fixture.nativeElement.querySelector('[data-og7-id="bulk-import-start"]') as HTMLButtonElement;

    expect(startButton).toBeTruthy();
    expect(startButton.className).toContain('bg-gradient-to-r');
    expect(startButton.className).not.toContain('bg-slate-900');
  });

  it('disables the dry-run checkbox when validate-only mode is selected', () => {
    const fixture = TestBed.createComponent(CompaniesBulkImportPageComponent);
    fixture.detectChanges();

    const modeSelect = fixture.nativeElement.querySelector('select[formControlName="mode"]') as HTMLSelectElement;
    modeSelect.value = 'validate-only';
    modeSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const dryRunInput = fixture.nativeElement.querySelector('input[formControlName="dryRun"]') as HTMLInputElement;

    expect(dryRunInput.disabled).toBeTrue();
    expect(dryRunInput.checked).toBeTrue();
  });
});
