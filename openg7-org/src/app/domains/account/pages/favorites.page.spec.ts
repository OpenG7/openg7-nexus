import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FavoritesService } from '@app/core/favorites.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { FavoritesPage } from './favorites.page';

class FavoritesServiceMock {
  readonly loading = signal(false).asReadonly();
  readonly error = signal<string | null>(null).asReadonly();
  readonly listSig = signal<string[]>([]);
  readonly list = this.listSig.asReadonly();

  readonly refresh = jasmine.createSpy('refresh');
  readonly clear = jasmine.createSpy('clear');
  readonly remove = jasmine.createSpy('remove');

  setItems(items: string[]): void {
    this.listSig.set(items);
  }
}

describe('FavoritesPage', () => {
  let favorites: FavoritesServiceMock;

  beforeEach(async () => {
    favorites = new FavoritesServiceMock();

    await TestBed.configureTestingModule({
      imports: [FavoritesPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: FavoritesService, useValue: favorites },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'fr',
      {
        pages: {
          favorites: {
            title: 'Mes favoris',
            description: 'Description',
            listTitle: 'Elements enregistres',
            empty: 'Aucun favori',
            emptyHint: 'Ajoutez des elements',
            labels: {
              total: '{{ count }} enregistres',
            },
            actions: {
              refresh: 'Rafraichir',
              clear: 'Tout effacer',
              remove: 'Retirer',
              open: 'Ouvrir',
              openFeed: 'Parcourir le fil',
              openSavedSearches: 'Ouvrir les recherches sauvegardees',
            },
            types: {
              opportunity: 'Opportunite',
              generic: 'Element enregistre',
            },
          },
        },
      },
      true
    );
    translate.use('fr');
  });

  it('styles the empty-state feed CTA with the shared primary accent instead of a black fill', () => {
    const fixture = TestBed.createComponent(FavoritesPage);
    fixture.detectChanges();

    const feedLink = fixture.nativeElement.querySelector('[data-og7-id="favorites-empty-feed"]') as HTMLAnchorElement;

    expect(feedLink).toBeTruthy();
    expect(feedLink.className).toContain('bg-gradient-to-r');
    expect(feedLink.className).toContain('from-cyan-500');
    expect(feedLink.className).not.toContain('bg-slate-900');
  });

  it('uses the standardized accent treatment for favorite cards and open actions', () => {
    favorites.setItems(['opportunity:offer-001']);

    const fixture = TestBed.createComponent(FavoritesPage);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('[data-og7="favorites-item"]') as HTMLElement;
    const openLink = fixture.nativeElement.querySelector('[data-og7-id="favorites-open"]') as HTMLAnchorElement;

    expect(card.className).toContain('bg-gradient-to-br');
    expect(card.className).toContain('to-cyan-50/45');
    expect(openLink.className).toContain('bg-sky-50');
    expect(openLink.className).toContain('text-sky-800');
  });
});
