import { expect, it } from 'vitest';
import { MAX_SESSION_BLOCKS, Pavement } from '../packages/play-core';
import { stressBoard } from '../apps/play/src/stress';

it('allows the 172,800th green block and rejects every subsequent placement without mutation', () => {
  const board = stressBoard(MAX_SESSION_BLOCKS - 1);
  expect(board.atLimit).toBe(false);
  board.drop(4, 0);
  expect(board.greens).toBe(172800); expect(board.atLimit).toBe(true);
  const length = board.tiles.length, height = board.height;
  expect(() => board.drop(0, 0)).toThrow('Session block limit');
  expect(() => board.place(0, height, 0)).toThrow('Session block limit');
  expect(board.tiles).toHaveLength(length); expect(board.height).toBe(height);
  expect(new Pavement().atLimit).toBe(false);
}, 20000);

it('does not charge automatic white fillers against the user placement budget', () => {
  const board = new Pavement();
  board.drop(1, 0); board.drop(0, 1); board.drop(2, 1); board.drop(0, 0);
  expect(board.greens).toBe(4); expect(board.tiles).toHaveLength(5);
});
