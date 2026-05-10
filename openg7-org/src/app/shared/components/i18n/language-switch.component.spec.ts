import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { LanguageSwitchComponent } from './language-switch.component';

class MockTranslateService {
  use = jasmine.createSpy('use');
}

describe('LanguageSwitchComponent', () => {
  it('calls TranslateService.use when language changes', () => {
    TestBed.configureTestingModule({
      imports: [LanguageSwitchComponent],
      providers: [{ provide: TranslateService, useClass: MockTranslateService }],
    });
    const fixture = TestBed.createComponent(LanguageSwitchComponent);
    const service = TestBed.inject(TranslateService) as any as MockTranslateService;
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'en';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(service.use).toHaveBeenCalledWith('en');
  });
});
