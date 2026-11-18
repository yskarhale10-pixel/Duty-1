import { VALIDATION_LIMITS } from '../types/diary';

export async function compressProfilePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format selected.'));
      img.onload = () => {
        const targetSize = 240;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas is unavailable in this browser.'));
          return;
        }

        // Center-crop square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > VALIDATION_LIMITS.photoDataUrl.maxLength && quality > 0.25) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        if (dataUrl.length > VALIDATION_LIMITS.photoDataUrl.maxLength) {
          reject(new Error('Photo is still too large after compression. Please choose a smaller image.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
