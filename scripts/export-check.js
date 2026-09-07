async (page) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const results = [];
  for (const count of [0, 600, 1200, 3600, 172800]) {
    await page.goto(`http://127.0.0.1:5173/?stress=${count}`);
    await page.locator('#playfield').waitFor();
    if (!(await page.locator('#pause-menu').evaluate(el => el.open))) await page.locator('#pause').click();
    const limitDisabled = await page.locator('#resume').isDisabled();
    if (limitDisabled !== (count === 172800)) throw new Error('Wrong limit state');
    const start = Date.now();
    await page.locator('#export').click();
    await page.waitForFunction(() => !document.querySelector('#receipt-save').disabled, null, { timeout: 60000 });
    const preparationMs = Date.now() - start;
    const preview = await page.evaluate(async () => {
      const scroll = document.querySelector('#receipt-scroll');
      let maxUses = 0;
      for (const position of [0, .25, .5, .75, 1]) {
        scroll.scrollTop = (scroll.scrollHeight - scroll.clientHeight) * position;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        maxUses = Math.max(maxUses, document.querySelectorAll('#receipt-image use').length);
      }
      return { maxUses, reachedBottom: Math.abs(scroll.scrollTop + scroll.clientHeight - scroll.scrollHeight) < 2 };
    });
    if (preview.maxUses > 150 || !preview.reachedBottom) throw new Error('Unbounded/broken preview');
    const isSVG = (await page.locator('#receipt-save').innerText()).includes('SVG');
    if (isSVG !== (count >= 3600)) throw new Error('Wrong format');
    let image;
    if (isSVG) {
      await page.evaluate(() => {
        const original = URL.createObjectURL.bind(URL);
        URL.createObjectURL = blob => { window.savedBlob = blob; return original(blob); };
      });
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#receipt-save').click();
      await (await downloadPromise).saveAs(`output/playwright/export-${count}.svg`);
      image = await page.evaluate(async () => {
        const blob = window.savedBlob, text = await blob.text();
        return { bytes: blob.size, type: blob.type, uses: (text.match(/<use /g) || []).length, paths: (text.match(/id="tile-/g) || []).length };
      });
      if (image.uses !== count || image.paths !== 3) throw new Error('Missing SVG history');
    } else {
      await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }));
      await page.locator('#receipt-save').click();
      image = await page.evaluate(async () => {
        const img = document.querySelector('#receipt-image img'); await img.decode();
        const blob = await (await fetch(img.src)).blob();
        return { bytes: blob.size, type: blob.type, width: img.naturalWidth, height: img.naturalHeight };
      });
      if (image.width !== 688) throw new Error('Photo was shrunk');
      const downloadPromise = page.waitForEvent('download');
      await page.evaluate(() => {
        const a = document.createElement('a'); a.href = document.querySelector('#receipt-image img').src; a.download = 'photo.png'; a.click();
      });
      await (await downloadPromise).saveAs(`output/playwright/export-${count}.png`);
      await page.locator('#receipt-save').click();
    }
    await page.locator('#pause').click(); await page.locator('#export').click();
    if (!(await page.locator('#receipt-image text').textContent()).includes('· piece')) throw new Error('Reset failed');
    results.push({ count, preparationMs, ...preview, ...image });
  }
  // Final placement, keyboard attempts after the cap, and export remaining available.
  await page.goto('http://127.0.0.1:5173/?stress=172799');
  await page.locator('#playfield').focus(); await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);
  if (!(await page.locator('#resume').isDisabled())) throw new Error('Cap not enforced after last tile');
  await page.keyboard.press('Escape');
  await page.locator('#playfield').focus(); await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);
  await page.locator('#pause').click(); await page.locator('#export').click();
  if (!(await page.locator('#receipt-image text').textContent()).includes('172800 piece')) throw new Error('Exceeded cap');
  // Abort an in-progress PNG preparation, reopen, then simulate native cancel/success.
  await page.goto('http://127.0.0.1:5173/?stress=1200');
  await page.locator('#pause').click(); await page.locator('#export').click();
  await page.locator('#receipt-back').click(); await page.locator('#export').click();
  await page.waitForFunction(() => !document.querySelector('#receipt-save').disabled, null, { timeout: 60000 });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Cancel', 'AbortError'); } });
  });
  await page.locator('#receipt-save').click();
  if (!(await page.locator('#receipt-image text').textContent()).includes('1200 piece')) throw new Error('Cancel erased history');
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {} }));
  await page.locator('#receipt-save').click();
  await page.locator('#pause').click(); await page.locator('#export').click();
  if (!(await page.locator('#receipt-image text').textContent()).includes('· piece')) throw new Error('Native success reset failed');
  if (errors.length) throw new Error(errors.join('\n'));
  return { results, capEnforced: true, cancellationPreservesHistory: true, errors };
}
