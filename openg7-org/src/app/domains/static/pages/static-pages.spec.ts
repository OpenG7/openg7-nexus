import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import en from '../../../../assets/i18n/en.json';

import { CreditsPage } from './credits.page';
import { FaqPage } from './faq.page';
import { GovernancePage } from './governance.page';
import { LegalPage } from './legal.page';
import { PrivacyPage } from './privacy.page';
import { TermsPage } from './terms.page';

describe('Static informational pages', () => {
  let translate: TranslateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), TermsPage, PrivacyPage, LegalPage, FaqPage, CreditsPage, GovernancePage],
      providers: [provideRouter([])],
    }).compileComponents();

    translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en as any, true);
    translate.use('en');
  });

  function createComponent<T>(component: Type<T>): ComponentFixture<T> {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the Terms page sections with translated content', () => {
    const fixture = createComponent(TermsPage);
    const element: HTMLElement = fixture.nativeElement;
    const container = element.querySelector('[data-og7-page="terms"]');

    expect(container).toBeTruthy();
    const headings = Array.from(container!.querySelectorAll('h2')).map(h => h.textContent?.trim());
    expect(headings).toContain('2. Account stewardship');

    const bulletLists = container!.querySelectorAll('ul');
    expect(bulletLists.length).withContext('Expected at least one bullet list').toBeGreaterThan(0);

    const toc = container!.querySelector('[data-og7="terms-toc"]');
    expect(toc).toBeTruthy();

    const sectionCards = container!.querySelectorAll('[data-og7="terms-section"]');
    expect(sectionCards.length).withContext('Expected section cards to be tagged').toBeGreaterThan(0);

    const supportCta = container!.querySelector('[data-og7-id="support-cta"]');
    expect((supportCta as HTMLAnchorElement | null)?.getAttribute('href')).toContain('mailto:legal@openg7.org');
  });

  it('renders the Privacy page with collection and rights sections', () => {
    const fixture = createComponent(PrivacyPage);
    const element: HTMLElement = fixture.nativeElement;
    const container = element.querySelector('[data-og7-page="privacy"]');

    expect(container).toBeTruthy();
    const headings = Array.from(container!.querySelectorAll('h2')).map(h => h.textContent?.trim());
    expect(headings).toContain('1. Data we collect');
    expect(headings).toContain('5. Your rights');
  });

  it('highlights legal credits and partners', () => {
    const fixture = createComponent(LegalPage);
    const element: HTMLElement = fixture.nativeElement;
    const container = element.querySelector('[data-og7-page="legal"]');

    expect(container).toBeTruthy();
    const creditsHeading = Array.from(container!.querySelectorAll('h2')).find(h =>
      h.textContent?.includes('Credits & partners')
    );
    expect(creditsHeading?.textContent?.trim()).toBe('Credits & partners');

    const partnersList = container!.querySelectorAll('ul li');
    expect(partnersList.length).withContext('Expected partner acknowledgements').toBeGreaterThan(0);

    const highlightLabels = Array.from(container!.querySelectorAll('[data-og7-legal-highlight] dt')).map(dt =>
      dt.textContent?.trim()
    );
    expect(highlightLabels).toContain('Registration');

    const contactEmails = Array.from(container!.querySelectorAll('[data-og7-legal-contact-channel] a')).map(a =>
      a.textContent?.trim()
    );
    expect(contactEmails).toContain('legal@openg7.org');

    const toc = container!.querySelector('[data-og7="legal-toc"]');
    expect(toc).toBeTruthy();

    const downloadPdf = container!.querySelector('[data-og7-id="download-pdf"]') as HTMLAnchorElement | null;
    expect(downloadPdf?.getAttribute('href')).toContain('legal-notice.pdf');

    const copyLegal = container!.querySelector('[data-og7-id="copy-legal"]');
    expect(copyLegal).toBeTruthy();
  });

  it('displays the FAQ items with questions and answers', () => {
    const fixture = createComponent(FaqPage);
    const element: HTMLElement = fixture.nativeElement;
    const container = element.querySelector('[data-og7-page="faq"]');

    expect(container).toBeTruthy();
    const questions = Array.from(container!.querySelectorAll('[data-og7="faq-item"] h2 button')).map(button =>
      button.textContent?.trim()
    );
    expect(questions.some((question) => question?.includes('What is OpenG7?'))).toBeTrue();

    const answers = container!.querySelectorAll('[data-og7="faq-item"] p.leading-relaxed');
    expect(answers.length).withContext('Expected FAQ answers to be rendered').toBeGreaterThan(0);
  });

  it('renders the Credits page hero and contributor cards', () => {
    const fixture = createComponent(CreditsPage);
    const element: HTMLElement = fixture.nativeElement;

    const container = element.querySelector('[data-og7-page="credits"]');
    expect(container).toBeTruthy();

    const heroTitle = element.querySelector('#creditsTitle');
    expect(heroTitle?.textContent?.trim()).toBe('OpenG7 starts with one builder');

    const contributorCards = element.querySelectorAll('[data-og7="credits-contributor-card"]');
    expect(contributorCards.length).withContext('Expected one founder card by default').toBe(1);
    expect(contributorCards[0]?.textContent).toContain('Samantha Létourneau');

    const founderNote = element.querySelector('[data-og7="credits-founder-note"]');
    expect(founderNote?.textContent).toContain('Why OpenG7 begins as a founder-led build');

    const filterButtons = Array.from(element.querySelectorAll('[data-og7="credits-filter"]')).map(btn =>
      btn.textContent?.trim()
    );
    expect(filterButtons).toContain('Reset');

    const charterCta = element.querySelector('[data-og7="credits-hero-cta"][data-og7-id="charter"]');
    expect(charterCta?.getAttribute('href')).toBe('/governance');

    const communityCta = element.querySelector('[data-og7="credits-community-cta"]');
    expect(communityCta?.getAttribute('href')).toBe('https://www.linkedin.com/in/letourneausamantha/');

    const founderNoteCta = element.querySelector('[data-og7="credits-founder-note-cta"]');
    expect(founderNoteCta?.getAttribute('href')).toBe('https://www.linkedin.com/in/letourneausamantha/');
  });

  it('presents the Governance page with commitments and board members', () => {
    const fixture = createComponent(GovernancePage);
    const element: HTMLElement = fixture.nativeElement;
    const container = element.querySelector('[data-og7-page="governance"]');

    expect(container).toBeTruthy();

    const commitmentCards = container!.querySelectorAll('article');
    expect(commitmentCards.length).withContext('Expected four governance commitments').toBe(4);

    const navLabels = Array.from(
      element.querySelectorAll('[data-og7-governance-nav] a')
    ).map(link => link.textContent?.trim());
    expect(navLabels.some(label => label?.includes('Board & stewardship'))).toBeTrue();

    const boardMembers = element.querySelectorAll('[data-og7-board-member]');
    expect(boardMembers.length).withContext('Expected at least one board member card').toBeGreaterThan(0);

    const governanceCtas = Array.from(element.querySelectorAll('[data-og7="governance-cta"]'));
    expect(governanceCtas.length).toBe(2);
    governanceCtas.forEach((cta) => {
      expect(cta.getAttribute('href')).toBe('https://www.linkedin.com/in/letourneausamantha/');
    });
  });

  it('filters contributors by province when the signal changes', () => {
    const fixture = createComponent(CreditsPage);
    const component = fixture.componentInstance;

    component.provinceFilter.set('QC');
    fixture.detectChanges();

    const filteredCards = fixture.nativeElement.querySelectorAll('[data-og7="credits-contributor-card"]');
    expect(filteredCards.length).toBe(1);

    component.search.set('does-not-exist');
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('[data-og7="credits-empty"]');
    expect(emptyState).toBeTruthy();

    component.resetFilters();
    fixture.detectChanges();

    const allCards = fixture.nativeElement.querySelectorAll('[data-og7="credits-contributor-card"]');
    expect(allCards.length).toBe(component.contributors().length);
  });
});
