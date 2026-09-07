async (page) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://172.30.1.71:5173/');
  const canvas = page.locator('#playfield'); await canvas.waitFor(); await page.waitForTimeout(350);
  // Grab the visible tile, lower it, reverse upward, then continue down and release.
  await page.mouse.move(195, 110); await page.mouse.down();
  await page.mouse.move(195, 185, { steps: 15 }); await page.waitForTimeout(100);
  await page.screenshot({ path: 'output/playwright/drag-lowered.png' });
  await page.mouse.move(195, 175, { steps: 8 }); await page.waitForTimeout(100);
  await page.screenshot({ path: 'output/playwright/drag-no-up.png' });
  await page.mouse.up(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  if (!(await page.locator('#receipt-image').innerHTML()).includes('0 pieces')) throw new Error('Release above the 75%-from-bottom line must not place');
  await page.getByRole('button', { name: '영수증 닫기', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  // Cross the new line while remaining well above the old 50% threshold.
  await page.mouse.move(195, 110); await page.mouse.down();
  await page.mouse.move(195, 230, { steps: 20 });
  await page.mouse.move(244, 230, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(350);
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  if (!(await page.locator('#receipt-image').innerHTML()).includes('1 pieces')) throw new Error('Drag release must place once');
  await page.reload(); await canvas.waitFor(); await canvas.focus();
  // Create an overhang: vertical at x=0, horizontal across its top.
  await canvas.press('ArrowUp'); await canvas.press('ArrowLeft'); await canvas.press('ArrowLeft'); await canvas.press('ArrowDown'); await page.waitForTimeout(350);
  await canvas.press('ArrowLeft'); await canvas.press('ArrowLeft'); await canvas.press('ArrowDown'); await page.waitForTimeout(350);
  await canvas.press('ArrowUp'); await page.waitForTimeout(150);
  await page.mouse.move(171, 110); await page.mouse.down();
  await page.mouse.move(171, 810, { steps: 25 });
  await page.mouse.move(122, 810, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(350);
  await page.screenshot({ path: 'output/playwright/drag-tucked.png' });
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const svg = await page.locator('#receipt-image svg').getAttribute('height');
  if (svg !== '392') throw new Error('Under-roof placement should keep height at 3, got ' + svg);
  if (!(await page.locator('#receipt-image').innerHTML()).includes('3 pieces')) throw new Error('Tuck should place third tile');
  if (errors.length) throw new Error(errors.join(', '));
  return { passed: true, dragRelease: true, tuckUnderRoof: true, errors };
}
