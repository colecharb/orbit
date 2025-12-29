export async function exportCanvasAsBlob(
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality: number = 1.0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to export canvas'));
        }
      },
      type,
      quality
    );
  });
}

export async function exportCanvasAsDataURL(
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality: number = 1.0
): Promise<string> {
  return canvas.toDataURL(type, quality);
}
