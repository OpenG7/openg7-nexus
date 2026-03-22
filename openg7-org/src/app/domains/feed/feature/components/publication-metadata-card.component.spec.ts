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
        formKey: 'energy-surplus-offer',
        schemaVersion: 1,
      },
      extensions: {
        energyType: 'hydroelectric',
        urgencyLevel: 'high',
        certifications: ['haccp', 'gfsi'],
      },
    });
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelector('[data-og7="publication-metadata-card"]')).toBeTruthy();
    expect(content).toContain('feed.publicationMetadata.title');
    expect(content).toContain('forms.energySurplus.title');
    expect(content).toContain('forms.energySurplus.fields.energyType.label');
    expect(content).toContain('hydroelectric');
    expect(content).toContain('haccp, gfsi');
  });
});