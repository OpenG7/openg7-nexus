import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { Og7PublicationMetadataCardComponent } from './publication-metadata-card.component';

describe('Og7PublicationMetadataCardComponent', () => {
  let fixture: ComponentFixture<Og7PublicationMetadataCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Og7PublicationMetadataCardComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(Og7PublicationMetadataCardComponent);
  });

  it('renders publication metadata rows from a known form config', () => {
    fixture.componentRef.setInput('metadata', {
      publicationForm: {
        formKey: 'hydrocarbon-surplus-offer',
        schemaVersion: 1,
      },
      extensions: {
        publicationType: 'slowdown',
        productType: 'crude-oil',
        logisticsMode: ['rail', 'storage-transfer'],
      },
    });
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelector('[data-og7="publication-metadata-card"]')).toBeTruthy();
    expect(content).toContain('feed.publicationMetadata.title');
    expect(content).toContain('forms.hydrocarbonSurplus.title');
    expect(content).toContain('forms.hydrocarbonSurplus.fields.publicationType.label');
    expect(content).toContain('forms.hydrocarbonSurplus.fields.publicationType.options.slowdown');
    expect(content).toContain('forms.hydrocarbonSurplus.fields.logisticsMode.options.rail');
    expect(content).toContain('forms.hydrocarbonSurplus.fields.logisticsMode.options.storageTransfer');
  });
});