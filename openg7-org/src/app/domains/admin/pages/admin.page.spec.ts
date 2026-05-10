/// <reference types="jasmine" />

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  NotificationStore,
  NotificationStoreApi,
} from '@app/core/observability/notification.store';
import { CompanyRecord, CompanyService } from '@app/core/services/company.service';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AdminPage } from './admin.page';

class CompanyServiceMock {
  readonly companiesSignal = signal<readonly CompanyRecord[]>([
    {
      id: 1,
      name: 'Northern Grid Labs',
      description: 'Grid telemetry coordination for regional operators.',
      website: 'https://example.com',
      status: 'pending',
      logoUrl: null,
      secondaryLogoUrl: null,
      capacities: [],
      sector: { id: 11, name: 'Energy' },
      province: { id: 22, name: 'Ontario' },
      country: 'CA',
      verificationStatus: 'pending',
      verificationSources: [],
      trustScore: 81,
      trustHistory: [],
    },
    {
      id: 2,
      name: 'Prairie Harvest AI',
      description: 'Agri-food matching and traceability operator.',
      website: 'https://example.org',
      status: 'approved',
      logoUrl: null,
      secondaryLogoUrl: null,
      capacities: [],
      sector: { id: 12, name: 'Agri-food' },
      province: { id: 23, name: 'Alberta' },
      country: 'CA',
      verificationStatus: 'verified',
      verificationSources: [],
      trustScore: 92,
      trustHistory: [],
    },
    {
      id: 3,
      name: 'Atlantic Signal Port',
      description: 'Cross-border maritime coordination node.',
      website: null,
      status: 'suspended',
      logoUrl: null,
      secondaryLogoUrl: null,
      capacities: [],
      sector: { id: 13, name: 'Logistics' },
      province: { id: 24, name: 'Nova Scotia' },
      country: 'CA',
      verificationStatus: 'suspended',
      verificationSources: [],
      trustScore: 43,
      trustHistory: [],
    },
  ]);
  readonly loadingSignal = signal(false);
  readonly errorSignal = signal<string | null>(null);
  readonly loadCompanies = jasmine.createSpy('loadCompanies');
  readonly updateStatus = jasmine
    .createSpy('updateStatus')
    .and.returnValue(of(this.companiesSignal()[0]));

  companies() {
    return this.companiesSignal.asReadonly();
  }

  loading() {
    return this.loadingSignal.asReadonly();
  }

  error() {
    return this.errorSignal.asReadonly();
  }
}

describe('AdminPage', () => {
  let service: CompanyServiceMock;
  let notifications: jasmine.SpyObj<NotificationStoreApi>;

  beforeEach(async () => {
    service = new CompanyServiceMock();
    notifications = jasmine.createSpyObj<NotificationStoreApi>('NotificationStoreApi', [
      'success',
      'info',
      'error',
    ]);

    await TestBed.configureTestingModule({
      imports: [AdminPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: CompanyService, useValue: service },
        { provide: NotificationStore, useValue: notifications },
      ],
    }).compileComponents();
  });

  it('renders the moderation hero and high-contrast summary badges', () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const shell = root.querySelector('.og7-admin-shell');
    const badges = Array.from(root.querySelectorAll('[data-og7="admin-summary-badge"]'));
    const neutralBadge = root.querySelector(
      '[data-og7="admin-summary-badge"][data-og7-id="neutral"]',
    );
    const warningBadge = root.querySelector(
      '[data-og7="admin-summary-badge"][data-og7-id="warning"]',
    );
    const readyBadge = root.querySelector('[data-og7="admin-summary-badge"][data-og7-id="ready"]');
    const criticalBadge = root.querySelector(
      '[data-og7="admin-summary-badge"][data-og7-id="critical"]',
    );

    expect(service.loadCompanies).toHaveBeenCalledWith({ status: 'all' });
    expect(shell?.className).toContain('shadow-[0_38px_120px_rgba(15,23,42,0.3)]');
    expect(root.textContent).toContain('Company moderation');
    expect(root.textContent).toContain('Queue guidance');
    expect(badges.length).toBe(4);
    for (const badge of badges) {
      expect((badge as HTMLElement).className).toContain('text-white');
      expect((badge as HTMLElement).className).toContain(
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
      );
    }
    expect((neutralBadge as HTMLElement).className).toContain('bg-cyan-200/18');
    expect((warningBadge as HTMLElement).className).toContain('bg-amber-200/20');
    expect((readyBadge as HTMLElement).className).toContain('bg-emerald-200/18');
    expect((criticalBadge as HTMLElement).className).toContain('bg-rose-200/18');
  });
});
