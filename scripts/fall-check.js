async (page) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://172.30.1.71:5173/');
  await page.locator('#playfield').waitFor();
  await page.waitForTimeout(150);
  await page.mouse.move(195, 120); await page.mouse.down();
  await page.mouse.move(195, 160, { steps: 8 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'output/playwright/fall-held.png' });
  await page.mouse.up(); await page.waitForTimeout(350);
  await page.screenshot({ path: 'output/playwright/fall-released.png' });
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  const preview = async () => {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const value = await page.locator('#receipt-image').innerHTML();
    if (await page.locator('#receipt-image text').count() !== 1) throw new Error('Receipt must contain date and count on one line');
    if ((await page.locator('#receipt-panel').innerText()).includes('저장하면')) throw new Error('Receipt contains old copy');
    await page.screenshot({ path: 'output/playwright/receipt-minimal.png' });
    await page.getByRole('button', { name: '영수증 닫기', exact: true }).click();
    return value;
  };
  if (!(await preview()).includes('· piece</text>')) throw new Error('Held tile placed unexpectedly');
  await page.waitForTimeout(1000);
  if (!(await preview()).includes('· piece</text>')) throw new Error('Pause did not stop falling');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForTimeout(12000);
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  if (!(await preview()).includes('01 piece')) throw new Error('Automatic falling did not place a tile');
  if (errors.length) throw new Error(errors.join(', '));
  return { passed: true, autoFall: true, pause: true, errors };
}
