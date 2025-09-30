// resources/js/utils/imageConverter.js

/**
 * Konversi berbagai format image ke PNG
 */
export const convertToPNG = (file) => {
    return new Promise((resolve, reject) => {
        // Jika file sudah PNG, langsung return
        if (file.type === 'image/png') {
            resolve({
                file: file,
                isConverted: false
            });
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            // Set canvas size sama dengan image
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw image ke canvas
            ctx.drawImage(img, 0, 0);

            // Konversi ke PNG
            canvas.toBlob((blob) => {
                if (blob) {
                    // Buat file baru dengan nama yang sama tapi extension .png
                    const fileName = file.name.replace(/\.[^/.]+$/, "") + '.png';
                    const pngFile = new File([blob], fileName, {
                        type: 'image/png',
                        lastModified: new Date().getTime()
                    });
                    resolve({
                        file: pngFile,
                        isConverted: true
                    });
                } else {
                    reject(new Error('Failed to convert image to PNG'));
                }
            }, 'image/png', 0.9); // quality 90%
        };

        img.onerror = function() {
            reject(new Error('Failed to load image'));
        };

        // Load image dari file
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Validasi dan konversi file image
 */
export const validateAndConvertImage = async (file) => {
    // Validasi tipe file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Please select a valid image file (JPEG, PNG, GIF, WebP, BMP)');
    }

    // Validasi ukuran file (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB');
    }

    // Konversi ke PNG jika bukan PNG
    if (file.type !== 'image/png') {
        return await convertToPNG(file);
    }

    return {
        file: file,
        isConverted: false
    };
};