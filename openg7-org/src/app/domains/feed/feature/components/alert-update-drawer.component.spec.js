import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AlertUpdateDrawerComponent } from './alert-update-drawer.component';
describe('AlertUpdateDrawerComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [AlertUpdateDrawerComponent, TranslateModule.forRoot()],
        });
    });
    it('renders alert update fields with blueprint hooks', () => {
        const fixture = TestBed.createComponent(AlertUpdateDrawerComponent);
        fixture.componentRef.setInput('open', true);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-og7-id="reason"]')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('[data-og7-id="summary"]')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('[data-og7-id="source-url"]')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('[data-og7-id="alert-update-submit"]')).toBeTruthy();
    });
    it('emits a normalized alert update payload on submit', () => {
        const fixture = TestBed.createComponent(AlertUpdateDrawerComponent);
        const submittedSpy = jasmine.createSpy('submitted');
        fixture.componentInstance.submitted.subscribe(submittedSpy);
        fixture.componentRef.setInput('open', true);
        fixture.detectChanges();
        const reasonSelect = fixture.nativeElement.querySelector('[data-og7-id="reason"]');
        const summaryInput = fixture.nativeElement.querySelector('[data-og7-id="summary"]');
        const sourceUrlInput = fixture.nativeElement.querySelector('[data-og7-id="source-url"]');
        const submitButton = fixture.nativeElement.querySelector('[data-og7-id="alert-update-submit"]');
        reasonSelect.value = 'newSource';
        reasonSelect.dispatchEvent(new Event('change'));
        summaryInput.value = '  Utility bulletin confirms the repair window moved to 18:00 local time.  ';
        summaryInput.dispatchEvent(new Event('input'));
        sourceUrlInput.value = '  https://example.org/grid-bulletin  ';
        sourceUrlInput.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        submitButton.click();
        expect(submittedSpy).toHaveBeenCalledTimes(1);
        expect(submittedSpy).toHaveBeenCalledWith({
            reason: 'newSource',
            summary: 'Utility bulletin confirms the repair window moved to 18:00 local time.',
            sourceUrl: 'https://example.org/grid-bulletin',
        });
    });
    it('renders the latest pending report in view mode', () => {
        const fixture = TestBed.createComponent(AlertUpdateDrawerComponent);
        fixture.componentRef.setInput('open', true);
        fixture.componentRef.setInput('mode', 'view');
        fixture.componentRef.setInput('existingReport', {
            id: 'alert-update-1',
            alertId: 'alert-001',
            alertTitle: 'Ice storm risk on Ontario transmission lines',
            route: '/feed/alerts/alert-001',
            reason: 'correction',
            summary: 'Environment Canada confirmed the event is now impacting two corridors.',
            sourceUrl: 'https://weather.gc.ca',
            createdAt: '2026-03-11T09:30:00.000Z',
            status: 'pending',
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-og7="alert-update-report-view"]')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('[data-og7-id="alert-update-submit"]')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Environment Canada confirmed the event is now impacting two corridors.');
    });
});
