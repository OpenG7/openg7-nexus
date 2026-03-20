import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { HomeFeedPanelsComponent } from './home-feed-panels.component';

describe('HomeFeedPanelsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeFeedPanelsComponent, TranslateModule.forRoot()],
    });
  });

  it('emits a view-all event for the opportunities panel', () => {
    const fixture = TestBed.createComponent(HomeFeedPanelsComponent);
    const component = fixture.componentInstance;
    const emitted: string[] = [];

    fixture.componentRef.setInput('alertItems', []);
    fixture.componentRef.setInput('opportunityItems', []);
    fixture.componentRef.setInput('indicatorItems', []);
    fixture.componentRef.setInput('subtitleForItem', () => '');
    component.viewAllRequested.subscribe((value) => emitted.push(value));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-og7-id="home-feed-view-all-opportunities"]') as HTMLButtonElement;
    button.click();

    expect(emitted).toEqual(['opportunities']);
  });
});