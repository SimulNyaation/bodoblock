async (page) => {
  await page.goto('http://127.0.0.1:5173/');
  const result = await page.evaluate(async () => {
    const { Pavement } = await import('/packages/play-core/index.ts');
    const { Receipt, receiptPhoto } = await import('/apps/play/src/export.ts');
    const board = new Pavement();
    board.drop(1, 0); board.drop(0, 1); board.drop(2, 1); board.drop(0, 0);
    for (let i = 0; i < 35; i++) board.drop(i % 5, i % 4);
    const receipt = new Receipt(board, new Date(2026, 8, 7));
    const png = await receiptPhoto(receipt);
    const width = receipt.width * 2, height = receipt.height * 2;
    const reference = receipt.svg().replace(/width="\d+" height="\d+"/, `width="${width}" height="${height}"`);
    const load = async blob => {
      const url = URL.createObjectURL(blob), image = new Image();
      image.src = url; await image.decode(); URL.revokeObjectURL(url); return image;
    };
    const actual = await load(png), expected = await load(new Blob([reference], { type: 'image/svg+xml' }));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); context.drawImage(expected, 0, 0);
    const expectedPixels = context.getImageData(0, 0, width, height).data;
    context.drawImage(actual, 0, 0);
    const actualPixels = context.getImageData(0, 0, width, height).data;
    let maxDiff = 0, mismatches = 0;
    for (let i = 0; i < actualPixels.length; i++) {
      const diff = Math.abs(actualPixels[i] - expectedPixels[i]);
      maxDiff = Math.max(maxDiff, diff); if (diff > 2) mismatches++;
    }
    // Show the header and a 256-row stripe boundary at normal resolution.
    const crop = document.createElement('canvas'); crop.width = width; crop.height = 720;
    const cropContext = crop.getContext('2d');
    cropContext.drawImage(actual, 0, 0, width, 360, 0, 0, width, 360);
    cropContext.drawImage(actual, 0, 500, width, 360, 0, 360, width, 360);
    crop.style.cssText = 'position:fixed;inset:0;width:100%;height:auto;z-index:99999'; document.body.append(crop);
    if (mismatches / actualPixels.length > .002) throw new Error(`Stripe mismatch: ${mismatches}, max ${maxDiff}`);
    return { width, height, maxDiff, mismatches, totalChannels: actualPixels.length, whiteTiles: board.tiles.length - board.greens };
  });
  await page.screenshot({ path: 'output/playwright/receipt-highres-detail.png' });
  return result;
}
