import { Directive, HostListener, Inject, Input, Optional } from '@angular/core';

import { OG7_MODAL_REF } from './og7-modal.tokens';
import { Og7ModalRef } from './og7-modal.types';

@Directive({
  selector: '[og7ModalClose]',
  standalone: true,
})
/**
 * Contexte : Appliquée dans les templates du dossier « core/ui/modal » en tant que directive Angular.
 * Raison d’être : Factorise le comportement DOM lié à « Og7 Modal Close » pour le rendre réutilisable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7ModalCloseDirective gérée par le framework.
 */
export class Og7ModalCloseDirective<TResult = unknown> {
  @Input('og7ModalClose') closeResult?: TResult;

  constructor(
    @Optional() @Inject(OG7_MODAL_REF) private readonly modalRef: Og7ModalRef<TResult> | null,
  ) {}

  /**
   * Contexte : Triggered when the host element is clicked.
   * Raison d’être : Prevents default navigation and closes the associated modal with the provided result.
   * @param event Mouse event emitted by the host element.
   * @returns void
   */
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (!this.modalRef) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.modalRef.close(this.closeResult);
  }
}
