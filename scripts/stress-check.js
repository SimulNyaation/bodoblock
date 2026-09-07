async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const results = [];
  for (const [count, layout] of [[600, 'wide'], [1200, 'wide'], [3600, 'wide'], [3600, 'tower']]) {
    await page.goto(`http://127.0.0.1:5173/?stress=${count}&layout=${layout}`);
    await page.locator('#playfield').waitFor();
    await page.waitForTimeout(300);
    await page.locator('#pause').click();
    const result = await page.evaluate(async () => {
      const start = performance.now();
      document.querySelector('#export').click();
      const syncMs = performance.now() - start;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const paintMs = performance.now() - start;
      const svg = document.querySelector('#receipt-image svg');
      const scroll = document.querySelector('#receipt-scroll');
      const frames = [];
      let previous = performance.now();
      for (let i = 0; i < 60; i++) {
        scroll.scrollTop = (scroll.scrollHeight - scroll.clientHeight) * i / 59;
        await new Promise(requestAnimationFrame);
        const now = performance.now(); frames.push(now - previous); previous = now;
      }
      frames.sort((a, b) => a - b);
      return {
        previewBytes: new Blob([svg.outerHTML]).size,
        width: Number(svg.getAttribute('width')), height: Math.round(parseFloat(document.querySelector('#receipt-image').style.height) / document.querySelector('#receipt-image').clientWidth * 344),
        syncMs, paintMs, scrollP95Ms: frames[56], scrollMaxMs: frames[59],
        reachedBottom: Math.abs(scroll.scrollTop + scroll.clientHeight - scroll.scrollHeight) < 2,
        header: svg.querySelector('text').textContent
      };
    });
    await page.screenshot({ path: `output/playwright/stress-${count}-${layout}.png` });
    // Exercise the real save path and confirm it resets rather than reseeding.
    await page.waitForFunction(() => !document.querySelector('#receipt-save').disabled);
    const isSVG = (await page.locator('#receipt-save').innerText()).includes('SVG');
    if (isSVG) {
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#receipt-save').click();
      await (await downloadPromise).saveAs(`output/playwright/stress-${count}-${layout}.svg`);
    } else {
      await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }));
      await page.locator('#receipt-save').click();
      const downloadPromise = page.waitForEvent('download');
      await page.evaluate(() => {
        const link = document.createElement('a'); link.href = document.querySelector('#receipt-image img').src;
        link.download = 'receipt.png'; link.click();
      });
      await (await downloadPromise).saveAs(`output/playwright/stress-photo-${count}-${layout}.png`);
      await page.locator('#receipt-save').click();
    }
    await page.locator('#pause').click();
    await page.locator('#export').click();
    const reset = (await page.locator('#receipt-image text').textContent()).includes('· piece');
    if (!reset || !result.reachedBottom) throw new Error('Save/reset or scroll failed');
    results.push({ count, layout, ...result, reset });
  }
  await page.goto('http://127.0.0.1:5173/?stress=1200');
  await page.locator('#playfield').waitFor();
  await page.waitForTimeout(300);
  await page.locator('#playfield').focus();
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(320);
  }
  await page.locator('#pause').click();
  await page.locator('#export').click();
  const afterPlay = await page.locator('#receipt-image text').textContent();
  if (!afterPlay.includes('1220 piece')) throw new Error(`Continued play failed: ${afterPlay}`);
  if (errors.length) throw new Error(errors.join('\n'));
  return { results, continuedPlacements: 20, errors, userAgent: await page.evaluate(() => navigator.userAgent) };
}
