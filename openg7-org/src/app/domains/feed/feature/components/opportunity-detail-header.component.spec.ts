import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { OpportunityDetailHeaderComponent } from './opportunity-detail-header.component';

describe('OpportunityDetailHeaderComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OpportunityDetailHeaderComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        feed: {
          title: 'Feed',
          opportunity: {
            detail: {
              breadcrumbOpportunities: 'Opportunities',
              breadcrumbCurrent: 'Import 300 MW',
              status: 'Status',
              urgency: 'Urgency',
              visibility: 'Visibility',
              cta: {
                makeOffer: 'Make offer',
                save: 'Save',
                saved: 'Saved',
                share: 'Share',
                report: 'Report',
                duplicate: 'Duplicate',
                archive: 'Archive',
              },
              sync: {
                synced: 'Synced',
              },
            },
          },
        },
      },
      true
    );
    translate.use('en');
  });

  it('renders breadcrumb link back to /feed', () => {
    const fixture = TestBed.createComponent(OpportunityDetailHeaderComponent);
    setRequiredInputs(fixture);
    fixture.detectChanges();

    const breadcrumbLinks = fixture.nativeElement.querySelectorAll('.opportunity-header__breadcrumb a');
    const feedLink: HTMLAnchorElement | undefined = breadcrumbLinks.item(0) as HTMLAnchorElement;

    expect(feedLink).toBeTruthy();
    expect(feedLink.getAttribute('href')).toContain('/feed');
  });

  it('binds the opportunities breadcrumb to the current feed item type', () => {
    const fixture = TestBed.createComponent(OpportunityDetailHeaderComponent);
    setRequiredInputs(fixture);
    fixture.componentRef.setInput('breadcrumbType', 'OFFER');
    fixture.detectChanges();

    const breadcrumbLinks = fixture.nativeElement.querySelectorAll('.opportunity-header__breadcrumb a');
    const opportunitiesLink = breadcrumbLinks.item(1) as HTMLAnchorElement;

    expect(opportunitiesLink.getAttribute('href')).toContain('/feed?type=OFFER');
  });
});

function setRequiredInputs(
  fixture: ReturnType<typeof TestBed.createComponent<OpportunityDetailHeaderComponent>>
): void {
  fixture.componentRef.setInput('title', 'Short-term import of 300 MW');
  fixture.componentRef.setInput('breadcrumbType', 'REQUEST');
  fixture.componentRef.setInput('routeLabel', 'Quebec -> Ontario');
  fixture.componentRef.setInput('subtitle', 'Energy | Import | Short window');
  fixture.componentRef.setInput('tags', ['Energy', 'Import', 'Winter']);
  fixture.componentRef.setInput('statusLabel', 'Open');
  fixture.componentRef.setInput('urgencyLabel', 'Winter peak');
  fixture.componentRef.setInput('visibilityLabel', 'Public');
  fixture.componentRef.setInput('saved', false);
  fixture.componentRef.setInput('syncState', 'synced');
}
