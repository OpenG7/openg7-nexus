import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PartnerProfile } from '@app/core/models/partner-profile';
import { PartnerProfileService } from '@app/core/services/partner-profile.service';
import { PartnerQuickActionsComponent } from '@app/domains/partners/partners/ui/partner-quick-actions.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, distinctUntilChanged, take } from 'rxjs';

@Component({
  selector: 'og7-entreprise',
  standalone: true,
  imports: [CommonModule, TranslateModule, PartnerQuickActionsComponent],
  templateUrl: './og7-entreprise.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/enterprise/entreprise » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Entreprise ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7EntrepriseComponent gérée par le framework.
 */
export class Og7EntrepriseComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly profiles = inject(PartnerProfileService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly routePartnerId = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id')),
      distinctUntilChanged(),
    ),
    { initialValue: this.route.snapshot.paramMap.get('id') },
  );

  private readonly locale = signal<'en' | 'fr'>(this.resolveLocale(this.translate.currentLang));

  protected readonly loading = signal(true);
  protected readonly partner = signal<PartnerProfile | null>(null);
  protected readonly partnerId = computed(() => {
    const entity = this.partner();
    if (entity) {
      return entity.id?.toString() ?? null;
    }
    return this.routePartnerId();
  });

  protected readonly partnerName = computed(() => {
    const entity = this.partner();
    if (!entity) {
      return null;
    }
    return entity.legalName || entity.displayName || null;
  });

  protected readonly mission = computed(() => {
    const entity = this.partner();
    if (!entity?.mission) {
      return null;
    }
    const locale = this.locale();
    return entity.mission[locale] ?? entity.mission.fr ?? entity.mission.en ?? null;
  });

  protected readonly highlights = computed(() => this.partner()?.highlights ?? []);

  constructor() {
    effect(() => {
      const id = this.routePartnerId();
      if (!id) {
        this.partner.set(null);
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      this.profiles
        .getProfile(id)
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => {
            this.partner.set(profile);
            this.loading.set(false);
          },
          error: (error) => {
            this.partner.set(null);
            this.loading.set(false);
          },
        });
    });

    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.locale.set(this.resolveLocale(event.lang));
    });
  }

  private resolveLocale(lang: string | undefined | null): 'en' | 'fr' {
    return lang === 'fr' ? 'fr' : 'en';
  }
}
