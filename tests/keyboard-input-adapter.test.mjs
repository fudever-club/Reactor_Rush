import assert from 'node:assert/strict';
import test from 'node:test';
import { KeyboardInputAdapter } from '../src/adapters/keyboard-input-adapter.ts';

function keyEvent(type, code) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'code', { value: code });
  return event;
}

test('keyboard adapter maps held keys and releases independently for both players', () => {
  const target = new EventTarget();
  const adapter = new KeyboardInputAdapter(target);
  const neutral = {
    p1: { moveAxis: 0, catch: false },
    p2: { moveAxis: 0, catch: false }
  };
  assert.deepEqual(adapter.read(), neutral);

  target.dispatchEvent(keyEvent('keydown', 'KeyD'));
  target.dispatchEvent(keyEvent('keydown', 'KeyS'));
  target.dispatchEvent(keyEvent('keydown', 'ArrowLeft'));
  target.dispatchEvent(keyEvent('keydown', 'ArrowDown'));
  assert.deepEqual(adapter.read(), {
    p1: { moveAxis: 1, catch: true },
    p2: { moveAxis: -1, catch: true }
  });

  target.dispatchEvent(keyEvent('keyup', 'KeyD'));
  target.dispatchEvent(keyEvent('keyup', 'ArrowDown'));
  assert.deepEqual(adapter.read(), {
    p1: { moveAxis: 0, catch: true },
    p2: { moveAxis: -1, catch: false }
  });
  adapter.destroy();
});

test('keyboard adapter clears held keys on window blur and detaches on destroy', () => {
  const target = new EventTarget();
  const adapter = new KeyboardInputAdapter(target);
  target.dispatchEvent(keyEvent('keydown', 'KeyA'));
  assert.equal(adapter.read().p1.moveAxis, -1);
  target.dispatchEvent(new Event('blur'));
  assert.equal(adapter.read().p1.moveAxis, 0);

  adapter.destroy();
  target.dispatchEvent(keyEvent('keydown', 'KeyA'));
  assert.equal(adapter.read().p1.moveAxis, 0);
});
