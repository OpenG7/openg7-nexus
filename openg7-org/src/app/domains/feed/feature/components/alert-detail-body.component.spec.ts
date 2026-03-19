import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { AlertDetailBodyComponent } from './alert-detail-body.component';

describe('AlertDetailBodyComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AlertDetailBodyComponent, TranslateModule.forRoot()],
    });
  });

  it('renders the textual zone context without the decorative map placeholder', () => {
    const fixture = TestBed.createComponent(AlertDetailBodyComponent);
    fixture.componentRef.setInput('summaryHeadline', 'Storm alert summary');
    fixture.componentRef.setInput('zones', ['Ontario', 'Quebec -> Ontario']);
    fixture.componentRef.setInput('infrastructures', ['Transmission corridor']);
    fixture.componentRef.setInput('sources', [
      { id: 'source-1', label: 'Environment Canada', href: null, confidence: 'High' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Transmission corridor');
    expect(fixture.nativeElement.querySelector('.alert-detail-body__map')).toBeNull();
    expect(fixture.nativeElement.querySelector('.alert-detail-body__sources strong')?.textContent).toContain('Environment Canada');
  });
});
