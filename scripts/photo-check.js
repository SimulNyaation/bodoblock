async (page) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const results = [];
  for (const count of [0, 600, 1200]) {
    await page.goto(`http://127.0.0.1:5173/?stress=${count}`);
    await page.locator('#pause').click();
    await page.locator('#export').click();
    await page.waitForFunction(() => !document.querySelector('#receipt-save').disabled);
    await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }));
    await page.locator('#receipt-save').click();
    const result = await page.evaluate(async () => {
      const img = document.querySelector('#receipt-image img'); await img.decode();
      const blob = await (await fetch(img.src)).blob();
      const bytes = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
      if (Array.from(bytes).join(',') !== '137,80,78,71,13,10,26,10') throw new Error('Not a PNG');
      const scroll = document.querySelector('#receipt-scroll'); scroll.scrollTop = scroll.scrollHeight;
      return { width: img.naturalWidth, height: img.naturalHeight, bytes: blob.size, type: blob.type };
    });
    const downloadPromise = page.waitForEvent('download');
    await page.evaluate(() => {
      const a = document.createElement('a'); a.href = document.querySelector('#receipt-image img').src;
      a.download = 'photo.png'; a.click();
    });
    await (await downloadPromise).saveAs(`output/playwright/photo-${count}.png`);
    await page.screenshot({ path: `output/playwright/photo-ui-${count}.png` });
    await page.locator('#receipt-save').click();
    await page.locator('#pause').click(); await page.locator('#export').click();
    if (!(await page.locator('#receipt-image text').textContent()).includes('· piece')) throw new Error('Reset failed');
    results.push({ count, ...result });
  }
  // Native iOS menu cannot be automated here; simulate rejection and resolution.
  await page.goto('http://127.0.0.1:5173/?stress=600');
  await page.locator('#pause').click(); await page.locator('#export').click();
  await page.waitForFunction(() => !document.querySelector('#receipt-save').disabled);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ files }) => {
      if (files[0].type !== 'image/png') throw new Error('Wrong type');
      throw new DOMException('Cancelled', 'AbortError');
    } });
  });
  await page.locator('#receipt-save').click();
  if (!(await page.locator('#receipt-image text').textContent()).includes('600 piece')) throw new Error('Cancel erased board');
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {} }));
  await page.locator('#receipt-save').click();
  await page.locator('#pause').click(); await page.locator('#export').click();
  if (!(await page.locator('#receipt-image text').textContent()).includes('· piece')) throw new Error('Menu success did not reset');
  if (errors.length) throw new Error(errors.join('\n'));
  return { results, cancelPreservesBoard: true, completedMenuResets: true, errors };
}
