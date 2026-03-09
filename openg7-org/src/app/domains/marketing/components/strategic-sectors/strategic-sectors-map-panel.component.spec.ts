import { TestBed } from '@angular/core/testing';
import { CORRIDOR_ITEMS } from '@app/domains/marketing/pages/strategic-sectors.models';
import { TranslateModule } from '@ngx-translate/core';

import { StrategicSectorsMapPanelComponent } from './strategic-sectors-map-panel.component';

describe('StrategicSectorsMapPanelComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StrategicSectorsMapPanelComponent, TranslateModule.forRoot()],
    });
  });

  it('renders one corridor card per input corridor', () => {
    const fixture = TestBed.createComponent(StrategicSectorsMapPanelComponent);
    fixture.componentRef.setInput('corridors', CORRIDOR_ITEMS);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('article');
    expect(cards.length).toBe(CORRIDOR_ITEMS.length);
  });

  it('applies risk class mapping to corridor badges', () => {
    const fixture = TestBed.createComponent(StrategicSectorsMapPanelComponent);
    fixture.componentRef.setInput('corridors', CORRIDOR_ITEMS);
    fixture.detectChanges();

    const badges = fixture.nativeElement.querySelectorAll('article span.rounded-full');
    expect((badges[0] as HTMLElement).className).toContain('border-amber-300/35');
    expect((badges[1] as HTMLElement).className).toContain('border-emerald-300/35');
    expect((badges[2] as HTMLElement).className).toContain('border-rose-300/35');
  });
});
