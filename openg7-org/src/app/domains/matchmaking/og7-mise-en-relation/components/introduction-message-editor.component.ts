import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'og7-matchmaking-introduction-message-editor',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './introduction-message-editor.component.html',
  styleUrls: ['./introduction-message-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/matchmaking/og7-mise-en-relation/components » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Introduction Message Editor ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns IntroductionMessageEditorComponent gérée par le framework.
 */
export class IntroductionMessageEditorComponent {
  readonly editorId = input('og7-intro-message');
  readonly value = input('');
  readonly touched = input(false);
  readonly invalid = input(false);
  readonly maxLength = input(600);

  readonly valueChange = output<string>();

  protected readonly hintId = computed(() => `${this.editorId()}-hint`);
  protected readonly errorId = computed(() => `${this.editorId()}-error`);
  protected readonly characterCount = computed(() => {
    const current = this.value()?.length ?? 0;
    const maximum = this.maxLength();
    return `${current}/${maximum}`;
  });
  protected readonly ariaDescription = computed(() => {
    const parts = [this.hintId()];
    if (this.showError()) {
      parts.push(this.errorId());
    }
    return parts.join(' ');
  });

  protected onInput(value: string): void {
    this.valueChange.emit(value);
  }

  protected showError(): boolean {
    return this.invalid() && this.touched();
  }
}
