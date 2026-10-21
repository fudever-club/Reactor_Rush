/** Use an existing browser when Playwright browser downloads are unavailable. */
export function launchBrowser(chromium, options = {}) {
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
  return chromium.launch({...options, headless:true, ...(executablePath ? {executablePath} : {})});
}
