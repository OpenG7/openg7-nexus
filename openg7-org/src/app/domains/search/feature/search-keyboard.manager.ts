export interface QuickSearchKeyboardHandlers {
  move(delta: number): void;
  select(): void;
  close(): void;
  focusInput(): void;
}

export function handleQuickSearchKeydown(
  event: KeyboardEvent,
  handlers: QuickSearchKeyboardHandlers,
): void {
  switch (event.key) {
    case 'ArrowDown':
      handlers.move(1);
      event.preventDefault();
      break;
    case 'ArrowUp':
      handlers.move(-1);
      event.preventDefault();
      break;
    case 'Tab':
      handlers.move(event.shiftKey ? -1 : 1);
      event.preventDefault();
      break;
    case 'Enter':
      handlers.select();
      event.preventDefault();
      break;
    case 'Escape':
      handlers.close();
      event.preventDefault();
      break;
    case 'k':
    case 'K':
      if (event.ctrlKey || event.metaKey) {
        handlers.focusInput();
        event.preventDefault();
      }
      break;
    default:
      break;
  }
}
