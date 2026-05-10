import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { OpportunityQnaMessage, OpportunityQnaTab } from './opportunity-detail.models';

@Component({
  selector: 'og7-opportunity-qna',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './opportunity-qna.component.html',
  styleUrl: './opportunity-qna.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpportunityQnaComponent {
  readonly messages = input<readonly OpportunityQnaMessage[]>([]);
  readonly activeTab = input<OpportunityQnaTab>('questions');

  readonly activeTabChange = output<OpportunityQnaTab>();
  readonly submitReply = output<string>();

  protected readonly draft = signal('');
  protected readonly tabs: OpportunityQnaTab[] = ['questions', 'offers', 'history'];

  protected readonly filteredMessages = computed(() =>
    this.messages().filter((entry) => entry.tab === this.activeTab()),
  );

  protected selectTab(tab: OpportunityQnaTab): void {
    this.activeTabChange.emit(tab);
  }

  protected updateDraft(value: string): void {
    this.draft.set(value);
  }

  protected handleSubmit(): void {
    const value = this.draft().trim();
    if (!value.length) {
      return;
    }
    this.submitReply.emit(value);
    this.draft.set('');
  }

  protected onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || !event.shiftKey) {
      return;
    }
    event.preventDefault();
    this.handleSubmit();
  }

  protected trackMessage(index: number, message: OpportunityQnaMessage): string {
    return message.id ?? `message-${index}`;
  }
}
