import { Injectable, computed, signal, Injector } from '@angular/core';

import { OG7_MODAL_DATA, OG7_MODAL_REF } from './og7-modal.tokens';
import {
  Og7ModalConfig,
  Og7ModalContent,
  Og7ModalOptions,
  Og7ModalRef,
  Og7ModalState,
  Og7ModalTemplateContext,
} from './og7-modal.types';

const DEFAULT_OPTIONS: Required<Og7ModalOptions> = {
  width: 'md',
  position: 'center',
  backdrop: true,
  closeOnEsc: true,
  closeOnBackdrop: true,
  panelClass: '',
  backdropClass: 'bg-slate-900/60',
  ariaLabel: null,
};

class Og7ModalRefImpl<TResult> implements Og7ModalRef<TResult> {
  private readonly _closed = signal(false);
  private resolveResult: (value: TResult | undefined) => void = () => undefined;

  readonly closed = this._closed.asReadonly();
  readonly result = new Promise<TResult | undefined>((resolve) => {
    this.resolveResult = resolve;
  });

  constructor(
    private readonly service: Og7ModalService,
    readonly id: number,
  ) {}

  close(result?: TResult): void {
    if (this._closed()) {
      return;
    }
    this.service.requestClose(this, result);
  }

  dismiss(): void {
    if (this._closed()) {
      return;
    }
    this.service.requestDismiss(this);
  }

  internalComplete(result?: TResult): void {
    if (this._closed()) {
      return;
    }
    this._closed.set(true);
    this.resolveResult(result);
  }
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/ui/modal ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Og7 Modal ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7ModalService gérée par le framework.
 */
export class Og7ModalService {
  private readonly _modal = signal<Og7ModalState | null>(null);
  private idCounter = 0;

  readonly state = this._modal.asReadonly();
  readonly isOpen = computed(() => this._modal() !== null);

  /**
   * Contexte : Called by feature modules to display a modal with the provided content.
   * Raison d’être : Centralises modal state management, ensuring only one modal is open at a time.
   * @param content Component, template or string rendered inside the modal.
   * @param config Optional configuration including data, context and presentation options.
   * @returns Reference allowing the caller to close or await the modal result.
   */
  open<TData = unknown, TResult = unknown>(
    content: Og7ModalContent,
    config: Og7ModalConfig<TData, TResult> = {},
  ): Og7ModalRef<TResult> {
    const { data, context, ...optionsInput } = config;

    if (this._modal()) {
      this.dismiss();
    }

    const id = ++this.idCounter;
    const ref = new Og7ModalRefImpl<TResult>(this, id);
    const options = this.mergeOptions(optionsInput);
    const modalState: Og7ModalState<TData, TResult> = {
      id,
      content,
      options,
      data,
      context: this.buildTemplateContext(context, ref, data),
      ref,
    };

    this._modal.set(modalState);
    return ref;
  }

  /**
   * Contexte : Used when the host component explicitly closes the current modal with a result.
   * Raison d’être : Finalises the modal lifecycle and resolves the awaiting promise.
   * @param result Optional result payload returned to the caller.
   * @returns void
   */
  close<TResult = unknown>(result?: TResult): void {
    const state = this._modal() as Og7ModalState<unknown, TResult> | null;
    if (!state) {
      return;
    }
    this.finalize(state, result);
  }

  /**
   * Contexte : Triggered by backdrop clicks or ESC key when dismissing without a result.
   * Raison d’être : Closes the modal while signalling an undefined outcome.
   * @returns void
   */
  dismiss(): void {
    const state = this._modal();
    if (!state) {
      return;
    }
    this.finalize(state, undefined);
  }

  /**
   * Contexte : Consulted by the modal container component to access the currently active modal state.
   * Raison d’être : Provides read access to the internal state signal without exposing the setter.
   * @returns Current modal state or null when closed.
   */
  getCurrentState(): Og7ModalState | null {
    return this._modal();
  }

  /**
   * Contexte : Called by the modal container to create an injector for dynamic content.
   * Raison d’être : Supplies modal data and reference tokens to projected components/templates.
   * @param state Active modal state driving the content.
   * @param parent Parent injector used as the creation base.
   * @returns Injector providing modal-scoped dependencies.
   */
  createContentInjector<TData, TResult>(
    state: Og7ModalState<TData, TResult>,
    parent: Injector,
  ): Injector {
    return Injector.create({
      providers: [
        { provide: OG7_MODAL_DATA, useValue: state.data },
        { provide: OG7_MODAL_REF, useValue: state.ref },
      ],
      parent,
    });
  }

  requestClose<TResult>(ref: Og7ModalRefImpl<TResult>, result?: TResult): void {
    const state = this._modal() as Og7ModalState<unknown, TResult> | null;
    if (!state || state.ref !== ref) {
      return;
    }
    this.finalize(state, result);
  }

  requestDismiss<TResult>(ref: Og7ModalRefImpl<TResult>): void {
    const state = this._modal() as Og7ModalState<unknown, TResult> | null;
    if (!state || state.ref !== ref) {
      return;
    }
    this.finalize(state, undefined);
  }

  private finalize<TResult>(state: Og7ModalState<unknown, TResult>, result?: TResult): void {
    this._modal.set(null);
    (state.ref as Og7ModalRefImpl<TResult>).internalComplete(result);
  }

  private mergeOptions(options: Og7ModalOptions): Required<Og7ModalOptions> {
    const merged = { ...DEFAULT_OPTIONS, ...options } satisfies Required<Og7ModalOptions>;
    return merged;
  }

  private buildTemplateContext<TResult, TData>(
    context: Og7ModalTemplateContext<TResult> | undefined,
    ref: Og7ModalRef<TResult>,
    data: TData | undefined,
  ): Og7ModalTemplateContext<TResult> {
    const base: Record<string, unknown> = { modal: ref };

    if (context && typeof context === 'object') {
      const withImplicit =
        context.$implicit === undefined && data !== undefined
          ? { ...context, $implicit: data }
          : context;
      return { ...base, ...withImplicit } as Og7ModalTemplateContext<TResult>;
    }

    if (data !== undefined) {
      return { ...base, $implicit: data } as Og7ModalTemplateContext<TResult>;
    }

    return base as Og7ModalTemplateContext<TResult>;
  }
}
