// Usage: SHOT_OUT=out.png SHOT_QUERY='?c=klee' electron --ozone-platform=x11 tools/shot.js
// Renders tools/gallery.html offscreen to a PNG (handy for checking the art).
const { app, BrowserWindow } = require('electron');
const path = require('path');
app.whenReady().then(async () => {
  const w = new BrowserWindow({ width: +(process.env.SHOT_W||1400), height: 1500, show: false, webPreferences: { offscreen: true } });
  await w.loadFile(path.join(__dirname, process.env.SHOT_PAGE || 'gallery.html'), { search: process.env.SHOT_QUERY || '' });
  await new Promise((r) => setTimeout(r, 600));
  const h = await w.webContents.executeJavaScript('document.body.scrollHeight');
  w.setContentSize(+(process.env.SHOT_W||1400), h + 20);
  await new Promise((r) => setTimeout(r, 400));
  const img = await w.webContents.capturePage();
  require('fs').writeFileSync(process.env.SHOT_OUT, img.toPNG());
  app.quit();
});
