import { OverlayContainer } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { AdminQualityComboboxComponent } from '@openg7/admin-quality';

describe('AdminQualityComboboxComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminQualityComboboxComponent],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('opens a dark overlay listbox with readable options', async () => {
    const fixture = TestBed.createComponent(AdminQualityComboboxComponent);
    fixture.componentRef.setInput('label', 'Domaine');
    fixture.componentRef.setInput('dataOg7Id', 'admin-quality-domain-filter');
    fixture.componentRef.setInput('value', 'all');
    fixture.componentRef.setInput('options', [
      { value: 'all', label: 'Domaine' },
      { value: 'trust', label: 'Trust et validation' },
    ]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector(
      '[data-og7-id="admin-quality-domain-filter"]',
    ) as HTMLButtonElement;

    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.textContent).toContain('Domaine');
    expect(trigger.className).toContain('bg-[#0c1729]');

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const listbox = document.body.querySelector(
      '[data-og7-id="admin-quality-domain-filter-listbox"]',
    ) as HTMLElement;
    const options = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '[data-og7="admin-quality-combobox-option"]',
      ),
    );

    expect(listbox).not.toBeNull();
    expect(listbox.className).toContain('bg-[linear-gradient');
    expect(listbox.className).toContain('text-slate-100');
    expect(options.map((option) => option.querySelector('span')?.textContent?.trim())).toEqual([
      'Domaine',
      'Trust et validation',
    ]);
  });

  it('emits the selected option and closes the overlay', async () => {
    const fixture = TestBed.createComponent(AdminQualityComboboxComponent);
    const valueChange = jasmine.createSpy('valueChange');
    fixture.componentRef.setInput('label', 'AI');
    fixture.componentRef.setInput('dataOg7Id', 'admin-quality-ai-provider');
    fixture.componentRef.setInput('value', 'codex');
    fixture.componentRef.setInput('options', [
      { value: 'codex', label: 'Codex' },
      { value: 'claude', label: 'Claude' },
    ]);
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector(
      '[data-og7-id="admin-quality-ai-provider"]',
    ) as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const option = document.body.querySelector(
      '[data-og7-id="admin-quality-ai-provider-claude"]',
    ) as HTMLButtonElement;

    expect(option).not.toBeNull();

    option.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(valueChange).toHaveBeenCalledOnceWith('claude');
    expect(
      document.body.querySelector('[data-og7-id="admin-quality-ai-provider-listbox"]'),
    ).toBeNull();
  });
});
