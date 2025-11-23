/**
 * Downloads a file from a URL or data URL by converting it to a blob
 * This ensures downloads work correctly even with CORS, relative paths, or base64 data URLs
 * @param {string} url - The URL or data URL of the file to download
 * @param {string} filename - The name to save the file as
 */
export const downloadFile = async (url, filename) => {
  try {
    let blob;
    
    // Check if it's a data URL (base64 encoded)
    if (url.startsWith('data:')) {
      // Convert data URL to blob
      const response = await fetch(url);
      blob = await response.blob();
    } else {
      // Regular URL - fetch it
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      blob = await response.blob();
    }
    
    // Create download link
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (error) {
    console.error('Error downloading file:', error);
    // Fallback to direct download
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (fallbackError) {
      console.error('Fallback download also failed:', fallbackError);
      alert('Failed to download file. Please try again or contact support.');
    }
  }
};

