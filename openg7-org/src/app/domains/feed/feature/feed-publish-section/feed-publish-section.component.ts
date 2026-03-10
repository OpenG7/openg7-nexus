import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
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
  private readonly router = inject(Router);

  private readonly redirectTargetSig = toSignal(
    this.router.events.pipe(
      startWith(null),
      map(() => this.resolveInternalUrl())
    ),
    { initialValue: this.resolveInternalUrl() }
  );

  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly redirectTarget = computed(() => this.redirectTargetSig());

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
}
