self.onmessage = ({ data: code }) => {
  let imageId = null;
  try {
    new Function('previewDisplay', code)((nextImage) => {
      imageId = nextImage;
    });
    self.postMessage({ imageId });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
