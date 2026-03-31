import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import coldChainCapacityOfferConfigJson from '../form-config/forms/cold-chain-capacity-offer.json';
import energySurplusOfferConfigJson from '../form-config/forms/energy-surplus-offer.json';
import { PublicationFormConfig } from '../form-config/publication-form-config.models';

import { Og7DynamicPublicationFormComponent } from './og7-dynamic-publication-form.component';

describe('Og7DynamicPublicationFormComponent', () => {
  let fixture: ComponentFixture<Og7DynamicPublicationFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Og7DynamicPublicationFormComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(Og7DynamicPublicationFormComponent);
    fixture.componentRef.setInput('config', energySurplusOfferConfigJson as PublicationFormConfig);
    fixture.detectChanges();
  });

  it('renders the configured sections and emits raw form values on submit', () => {
    const component = fixture.componentInstance as unknown as {
      form: () => { patchValue: (value: Record<string, unknown>) => void };
      handleSubmit: () => void;
      submitted: { emit: (value: Record<string, unknown>) => void };
    };
    const submitSpy = spyOn(component.submitted, 'emit');

    component.form().patchValue({
      title: 'Hydro surplus',
      summary: 'Temporary hydro surplus available for the next 7 days.',
      energyType: 'hydroelectric',
      urgencyLevel: 'medium',
      capacityMw: 120,
      pricingMode: 'indexed',
      availabilityStart: '2026-03-21',
      availabilityEnd: '2026-03-28',
      fromProvinceId: 'qc',
      toProvinceId: 'on',
      deliveryConstraints: 'Subject to dispatch confirmation.',
      contactChannel: 'Trading desk',
      tags: 'hydro, peak',
    });

    component.handleSubmit();

    expect(submitSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Hydro surplus',
        capacityMw: 120,
        fromProvinceId: 'qc',
        toProvinceId: 'on',
      })
    );
    expect(fixture.nativeElement.querySelectorAll('.dynamic-publication-form__section').length).toBe(5);
  });

  it('blocks submission and shows validation feedback when date order is invalid', () => {
    const component = fixture.componentInstance as unknown as {
      form: () => { patchValue: (value: Record<string, unknown>) => void };
      handleSubmit: () => void;
      submitted: { emit: (value: Record<string, unknown>) => void };
    };
    const submitSpy = spyOn(component.submitted, 'emit');

    component.form().patchValue({
      title: 'Hydro surplus',
      summary: 'Temporary hydro surplus available for the next 7 days.',
      energyType: 'hydroelectric',
      capacityMw: 120,
      pricingMode: 'indexed',
      availabilityStart: '2026-03-28',
      availabilityEnd: '2026-03-21',
      fromProvinceId: 'qc',
      deliveryConstraints: 'Subject to dispatch confirmation.',
      contactChannel: 'Trading desk',
    });
    fixture.detectChanges();

    component.handleSubmit();
    fixture.detectChanges();

    expect(submitSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('forms.energySurplus.validation.availabilityEnd.dateOrder');
  });

  it('renders multiselect, checkbox, and datetime controls for advanced templates', () => {
    fixture.componentRef.setInput('config', coldChainCapacityOfferConfigJson as PublicationFormConfig);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: () => { patchValue: (value: Record<string, unknown>) => void; value: Record<string, unknown> };
    };

    component.form().patchValue({
      title: 'Cold-chain overflow capacity',
      summary: 'Temporary refrigerated pallet positions available.',
      availablePallets: 180,
      temperatureRange: 'chilled',
      certifications: ['haccp', 'gfsi'],
      crossDockAvailable: true,
      availableFrom: '2026-03-21T08:00',
      availableUntil: '2026-03-28T18:00',
      fromProvinceId: 'qc',
      contactChannel: 'Cold-chain desk',
    });
    fixture.detectChanges();

    expect(component.form().value['certifications']).toEqual(['haccp', 'gfsi']);
    expect(component.form().value['crossDockAvailable']).toBeTrue();
    expect(fixture.nativeElement.querySelector('select[multiple]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[type="datetime-local"]')).toBeTruthy();
  });

  it('applies visibleWhen conditions for scenario-specific fields', () => {
    fixture.componentRef.setInput('config', coldChainCapacityOfferConfigJson as PublicationFormConfig);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: () => { patchValue: (value: Record<string, unknown>) => void };
    };

    expect(fixture.nativeElement.querySelector('#minimumCommitmentDays')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('#handlingNotes')).toBeFalsy();

    component.form().patchValue({
      crossDockAvailable: true,
      temperatureRange: 'frozen',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#minimumCommitmentDays')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#handlingNotes')).toBeTruthy();
  });
});