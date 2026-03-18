import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { map, startWith } from 'rxjs/operators';

import { Og7FeedComposerComponent } from '../og7-feed-composer/og7-feed-composer.component';

@Component({
  selector: 'og7-feed-publish-section',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, Og7FeedComposerComponent],
  templateUrl: './feed-publish-section.component.html',
  styleUrl: './feed-publish-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedPublishSectionComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authLinkRef = viewChild<ElementRef<HTMLAnchorElement>>('authLink');
  private readonly publishButtonRef = viewChild<ElementRef<HTMLButtonElement>>('publishButton');
  private readonly composerRef = viewChild<{ focusPrimaryField?: () => void }>('composer');
  private readonly pendingAutoFocus = signal(false);
  private readonly autoOpenedDraftKey = signal<string | null>(null);

  private readonly redirectTargetSig = toSignal(
    this.router.events.pipe(
      startWith(null),
      map(() => this.resolveInternalUrl())
    ),
    { initialValue: this.resolveInternalUrl() }
  );
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly redirectTarget = computed(() => this.redirectTargetSig());
  protected readonly drawerOpen = signal(false);

  constructor() {
    effect(() => {
      if (!this.drawerOpen() || !this.pendingAutoFocus()) {
        return;
      }

      if (this.isAuthenticated()) {
        const composer = this.composerRef();
        if (!composer?.focusPrimaryField) {
          return;
        }
        this.pendingAutoFocus.set(false);
        this.scheduleFocus(() => composer.focusPrimaryField?.());
        return;
      }

      const authLink = this.authLinkRef();
      if (!authLink) {
        return;
      }

      this.pendingAutoFocus.set(false);
      this.scheduleFocus(() => authLink.nativeElement.focus());
    });

    effect(() => {
      const draftKey = this.buildDraftKey();
      if (!draftKey) {
        if (this.autoOpenedDraftKey() !== null) {
          this.autoOpenedDraftKey.set(null);
        }
        return;
      }

      if (draftKey === this.autoOpenedDraftKey()) {
        return;
      }

      this.autoOpenedDraftKey.set(draftKey);
      this.openDrawer();
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected handleEscape(event: Event): void {
    if (!this.drawerOpen()) {
      return;
    }
    event.preventDefault();
    this.closeDrawer();
  }

  focusPrimaryAction(): void {
    this.openDrawer();
  }

  protected openDrawer(): void {
    this.drawerOpen.set(true);
    this.pendingAutoFocus.set(true);
  }

  protected closeDrawer(): void {
    if (!this.drawerOpen()) {
      return;
    }

    this.drawerOpen.set(false);
    this.pendingAutoFocus.set(false);
    this.restoreTriggerFocus();
  }

  protected onBackdropClick(): void {
    this.closeDrawer();
  }

  protected handlePublished(): void {
    this.clearDraftQueryParams();
    this.closeDrawer();
  }

  private resolveInternalUrl(): string {
    const navigation = this.router.getCurrentNavigation();
    const url = navigation?.finalUrl?.toString() ?? navigation?.extractedUrl?.toString() ?? this.router.url;
    if (typeof url !== 'string') {
      return '/feed';
    }

    const normalized = url.trim();
    if (!normalized) {
      return '/feed';
    }

    return normalized.startsWith('/') ? normalized : `/${normalized.replace(/^\/+/, '')}`;
  }

  private restoreTriggerFocus(): void {
    const button = this.publishButtonRef();
    if (!button) {
      return;
    }

    this.scheduleFocus(() => button.nativeElement.focus());
  }

  private scheduleFocus(action: () => void): void {
    setTimeout(action, 0);
  }

  private buildDraftKey(): string | null {
    const query = this.queryParamMap();
    const keys = [
      'draftSource',
      'draftAlertId',
      'draftOriginType',
      'draftOriginId',
      'draftConnectionMatchId',
      'draftType',
      'draftMode',
      'draftSectorId',
      'draftFromProvinceId',
      'draftToProvinceId',
      'draftTitle',
      'draftSummary',
      'draftTags',
    ];
    const values = keys.map(key => query.get(key)?.trim() ?? '');
    return values.some(Boolean) ? values.join('|') : null;
  }

  private clearDraftQueryParams(): void {
    const query = this.queryParamMap();
    const keys = [
      'draftSource',
      'draftAlertId',
      'draftOriginType',
      'draftOriginId',
      'draftConnectionMatchId',
      'draftType',
      'draftMode',
      'draftSectorId',
      'draftFromProvinceId',
      'draftToProvinceId',
      'draftTitle',
      'draftSummary',
      'draftTags',
    ];
    if (!keys.some(key => query.get(key) !== null)) {
      return;
    }

    const clearedQuery = Object.fromEntries(keys.map(key => [key, null]));
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: clearedQuery,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
