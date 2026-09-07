import { describe, it, expect } from 'vitest';
import { Pavement, WIDTH } from '../packages/play-core';
import { receiptSVG } from '../apps/play/src/export';
describe('minimal free placement', () => {
  it('slides a lowered vertical tile under an overhang instead of jumping onto its roof', () => {
    const board = new Pavement(); board.drop(0, 1); board.drop(0, 0);
    expect(board.landing(1, 1).y).toBe(3);
    expect(board.moveSide(2, 0, 1, 1)).toBe(1);
    expect(board.landingFrom(1, 0, 1).y).toBe(0);
    expect(board.place(1, 0, 1)[0]).toMatchObject({ x: 1, y: 0, h: 2 });
  });
  it('cannot slide through a wall or place a tile through an obstruction', () => {
    const board = new Pavement(); board.drop(2, 1);
    expect(board.moveSide(0, 0, 4, 1)).toBe(1);
    expect(board.canPlace(2, 0.5, 0)).toBe(false);
    expect(board.landingFrom(2, 5.3, 0).y).toBe(2);
    expect(() => board.place(2, 0, 0)).toThrow();
  });
  it('lands at the first obstruction, rotates dimensions, and clamps both edges', () => {
    const board = new Pavement();
    expect(board.landing(-8, 0)).toMatchObject({ x: 0, y: 0, w: 2, h: 1 });
    board.drop(2, 1);
    expect(board.landing(1, 0)).toMatchObject({ x: 1, y: 2 });
    expect(board.landing(5, 0).x).toBe(WIDTH - 2);
    expect(board.landing(5, 1)).toMatchObject({ x: 5, y: 0, w: 1, h: 2 });
  });
  it('fills exactly one center after four manually positioned pieces surround it', () => {
    const board = new Pavement();
    expect(board.drop(1, 0)).toHaveLength(1);
    expect(board.drop(0, 1)).toHaveLength(1);
    expect(board.drop(2, 1)).toHaveLength(1);
    const last = board.drop(0, 0);
    expect(last).toHaveLength(2);
    expect(last[1]).toMatchObject({ x: 1, y: 1, w: 1, h: 1, white: true });
    expect(board.greens).toBe(4); expect(board.tiles).toHaveLength(5);
    board.drop(0, 0);
    expect(board.tiles.filter(tile => tile.white)).toHaveLength(1);
  });
  it('does not fill a merely stacked or open arrangement', () => {
    const board = new Pavement();
    for (let i = 0; i < 12; i++) board.drop(2, 0);
    expect(board.tiles.some(tile => tile.white)).toBe(false);
  });
  it('fills a cardinally enclosed cell even when a diagonal is empty', () => {
    const board = new Pavement();
    board.drop(2, 0); board.drop(1, 1); board.drop(3, 0);
    const added = board.drop(1, 0);
    expect(added.filter(tile => tile.white)).toEqual([expect.objectContaining({ x: 2, y: 1 })]);
    expect(board.tiles.some(tile => tile.x === 3 && tile.y === 2)).toBe(false);
  });
  it('counts the wall and floor as closed sides for a one-cell gap', () => {
    const board = new Pavement();
    board.drop(1, 0);
    expect(board.drop(0, 0)).toContainEqual(expect.objectContaining({ x: 0, y: 0, white: true }));
  });
  it('leaves enclosed gaps larger than one cell empty', () => {
    const board = new Pavement();
    board.drop(1, 1); board.drop(0, 0);
    expect(board.tiles.some(tile => tile.white)).toBe(false);
  });
  it('keeps empty-column landings in the camera band without moving settled pieces', () => {
    const board = new Pavement();
    const [first] = board.drop(0, 0);
    board.advanceFloor(20);
    expect(board.landing(4, 1).y).toBe(20);
    expect(first.y).toBe(0);
    board.advanceFloor(5);
    expect(board.landing(4, 1).y).toBe(20);
  });
  it('exports actual placed pieces and white centers, without meters or persisted state', () => {
    const board = new Pavement();
    board.drop(1, 0); board.drop(0, 1); board.drop(2, 1); board.drop(0, 0);
    const svg = receiptSVG(board, new Date('2026-09-06T00:00:00Z'));
    expect(svg).toContain('2026.09.06 · 05 piece');
    expect(svg.match(/<text /g)).toHaveLength(1);
    expect(svg).toContain('font-size="12"');
    expect(svg).toContain('stroke-dasharray="3 4"');
    expect(receiptSVG(new Pavement(), new Date(2026, 8, 7))).toContain('2026.09.07 · piece</text>');
    expect(svg).not.toContain('made by you');
    expect(svg).not.toContain('blockstep');
    expect(svg).toContain('#f5f0df'); expect(svg).not.toContain('meters');
    expect(new Pavement().tiles).toHaveLength(0);
  });
});
