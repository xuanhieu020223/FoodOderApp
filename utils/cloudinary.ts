// Cloudinary configuration
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dsbhlgu9c/upload';
const UPLOAD_PRESET = 'FoodOderApp';

/**
 * Upload image to Cloudinary
 * @param uri - Local file URI from ImagePicker
 * @returns Promise<string> - Secure URL of uploaded image
 */
export const uploadImageToCloudinary = async (uri: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    } as any);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.secure_url) {
      throw new Error('No secure_url in response');
    }

    return data.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

