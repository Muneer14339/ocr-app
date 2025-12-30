(async function() {
  const statusEl = document.getElementById('status');
  const progressEl = document.getElementById('progress-fill');
  const percentageEl = document.getElementById('percentage');

  // Get extension ID from URL parameter (if needed)
  const params = new URLSearchParams(window.location.search);
  const extensionId = params.get('ext') || chrome.runtime.id;

  try {
    statusEl.textContent = 'Loading image...';

    // Request image from extension
    chrome.runtime.sendMessage(extensionId, { action: 'getOCRImage' }, async (response) => {
      if (!response || !response.imageData) {
        statusEl.textContent = 'Error: No image found';
        return;
      }

      statusEl.textContent = 'Initializing OCR engine...';

      // Create Tesseract worker
      const worker = Tesseract.createWorker({
        logger: m => {
          console.log(m);
          
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            progressEl.style.width = progress + '%';
            percentageEl.textContent = progress + '%';
            statusEl.textContent = 'Extracting text...';
          }
        }
      });

      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');

      statusEl.textContent = 'Processing image...';

      // Perform OCR
      const { data: { text } } = await worker.recognize(response.imageData);

      await worker.terminate();

      statusEl.textContent = 'Complete!';
      progressEl.style.width = '100%';
      percentageEl.textContent = '100%';

      // Send result back to extension
      chrome.runtime.sendMessage(extensionId, {
        action: 'ocrComplete',
        text: text
      }, () => {
        // Window will be closed by extension
      });
    });

  } catch (error) {
    console.error('OCR Error:', error);
    statusEl.textContent = 'Error: ' + error.message;
  }
})();