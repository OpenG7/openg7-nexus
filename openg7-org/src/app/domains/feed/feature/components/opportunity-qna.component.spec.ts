import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { OpportunityQnaComponent } from './opportunity-qna.component';

describe('OpportunityQnaComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OpportunityQnaComponent, TranslateModule.forRoot()],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        feed: {
          opportunity: {
            detail: {
              conversation: 'Conversation',
              tabs: {
                questions: 'Questions',
                offers: 'Offers',
                history: 'History',
              },
              composePrompt: 'Compose',
              composePlaceholder: 'Ask a question',
              sendReply: 'Send',
              shortcut: {
                reply: 'Shift+Enter',
              },
              emptyTab: 'No messages yet',
            },
          },
        },
      },
      true,
    );
    translate.use('en');
  });

  it('emits activeTabChange when clicking tab buttons', () => {
    const fixture = TestBed.createComponent(OpportunityQnaComponent);
    const tabSpy = jasmine.createSpy('activeTabChange');
    fixture.componentInstance.activeTabChange.subscribe(tabSpy);
    fixture.componentRef.setInput('activeTab', 'questions');
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();

    const historyTab: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-og7-id="opportunity-tab-history"]',
    );
    expect(historyTab).toBeTruthy();

    historyTab?.click();
    expect(tabSpy).toHaveBeenCalledTimes(1);
    expect(tabSpy).toHaveBeenCalledWith('history');
  });

  it('emits submitReply on Shift+Enter in composer', () => {
    const fixture = TestBed.createComponent(OpportunityQnaComponent);
    const submitSpy = jasmine.createSpy('submitReply');
    fixture.componentInstance.submitReply.subscribe(submitSpy);
    fixture.componentRef.setInput('activeTab', 'questions');
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();

    const composer: HTMLTextAreaElement | null = fixture.nativeElement.querySelector(
      '#opportunity-qna-composer',
    );
    expect(composer).toBeTruthy();

    if (!composer) {
      return;
    }

    composer.value = 'Need updated timeline';
    composer.dispatchEvent(new Event('input'));
    composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).toHaveBeenCalledWith('Need updated timeline');
  });
});
