(async function() {
  const statusEl = document.getElementById('status');
  const progressEl = document.getElementById('progress-fill');
  const percentageEl = document.getElementById('percentage');

  console.log('OCR App started');

  try {
    // Get image from URL hash or storage
    const imageData = await getImageData();
    
    if (!imageData) {
      statusEl.textContent = 'Error: No image found';
      console.error('No image data received');
      return;
    }

    console.log('Image data received, length:', imageData.length);
    statusEl.textContent = 'Initializing OCR engine...';

    // Create Tesseract worker
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        console.log('Tesseract:', m);
        
        if (m.status === 'recognizing text') {
          const progress = Math.round(m.progress * 100);
          progressEl.style.width = progress + '%';
          percentageEl.textContent = progress + '%';
          statusEl.textContent = 'Extracting text...';
        } else {
          statusEl.textContent = m.status || 'Processing...';
        }
      }
    });

    console.log('Worker created, starting recognition...');
    statusEl.textContent = 'Processing image...';

    // Perform OCR
    const { data: { text } } = await worker.recognize(imageData);

    await worker.terminate();

    console.log('OCR Complete! Text:', text);
    
    statusEl.textContent = 'Complete! ✅';
    progressEl.style.width = '100%';
    percentageEl.textContent = '100%';

    // Send result back via postMessage
    if (window.opener) {
      window.opener.postMessage({
        type: 'OCR_COMPLETE',
        text: text
      }, '*');
      
      // Auto close after 1 second
      setTimeout(() => window.close(), 1000);
    }

  } catch (error) {
    console.error('OCR Error:', error);
    statusEl.textContent = 'Error: ' + error.message;
  }
})();

// Get image data from storage or URL
async function getImageData() {
  // Try to get from localStorage (set by extension)
  const stored = localStorage.getItem('ocrImage');
  if (stored) {
    console.log('Got image from localStorage');
    localStorage.removeItem('ocrImage'); // Clean up
    return stored;
  }

  // Try to get from URL hash
  const hash = window.location.hash.substring(1);
  if (hash && hash.startsWith('data:image')) {
    console.log('Got image from URL hash');
    return decodeURIComponent(hash);
  }

  // Wait a bit for extension to set data
  console.log('Waiting for image data...');
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      const data = localStorage.getItem('ocrImage');
      if (data) {
        clearInterval(interval);
        localStorage.removeItem('ocrImage');
        resolve(data);
      } else if (attempts++ > 50) { // 5 seconds timeout
        clearInterval(interval);
        resolve(null);
      }
    }, 100);
  });
}