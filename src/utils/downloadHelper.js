/**
 * Downloads a file from a URL by fetching it as a blob
 * This ensures downloads work correctly even with CORS or relative paths
 * @param {string} url - The URL of the file to download
 * @param {string} filename - The name to save the file as
 */
export const downloadFile = async (url, filename) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    // Fallback to direct download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

