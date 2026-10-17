import { mapKeyboardSnapshot, type InputAdapter, type KeyboardSnapshot } from '../gameplay/core.ts';

const SUPPORTED_CODES = new Set([
  'KeyA', 'KeyD', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowDown'
]);

export class KeyboardInputAdapter implements InputAdapter {
  private readonly pressedCodes = new Set<string>();
  private readonly target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  private destroyed = false;

  constructor(target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> = window) {
    this.target = target;
    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('blur', this.handleBlur);
  }

  read() {
    const snapshot: KeyboardSnapshot = {
      a: this.pressedCodes.has('KeyA'),
      d: this.pressedCodes.has('KeyD'),
      s: this.pressedCodes.has('KeyS'),
      left: this.pressedCodes.has('ArrowLeft'),
      right: this.pressedCodes.has('ArrowRight'),
      down: this.pressedCodes.has('ArrowDown')
    };
    return mapKeyboardSnapshot(snapshot);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.target.removeEventListener('blur', this.handleBlur);
    this.pressedCodes.clear();
    this.destroyed = true;
  }

  private handleKeyDown = (event: Event): void => {
    const code = (event as KeyboardEvent).code;
    if (!SUPPORTED_CODES.has(code)) return;
    this.pressedCodes.add(code);
    if (code.startsWith('Arrow') && event.cancelable) event.preventDefault();
  };

  private handleKeyUp = (event: Event): void => {
    this.pressedCodes.delete((event as KeyboardEvent).code);
  };

  private handleBlur = (): void => {
    this.pressedCodes.clear();
  };
}


