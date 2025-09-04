const { cloudinary } = require('../config');
const fs = require('fs');

// Upload single file to Cloudinary
const uploadSingleFile = async (file, folder = 'vvd') => {
  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: folder,
      resource_type: 'auto',
      public_id: `${folder}_${Date.now()}`
    });

    // Clean up temp file
    if (fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // Clean up temp file on error
    if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }

    return {
      success: false,
      error: error.message
    };
  }
};

// Upload multiple files to Cloudinary
const uploadMultipleFiles = async (files, folder = 'vvd') => {
  try {
    const uploadPromises = files.map(file => uploadSingleFile(file, folder));
    const results = await Promise.all(uploadPromises);
    
    return {
      success: true,
      files: results
    };
  } catch (error) {
    console.error('Multiple file upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Validate file type
const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.mimetype);
};

// Validate file size (in bytes)
const validateFileSize = (file, maxSize) => {
  return file.size <= maxSize;
};

// File upload middleware
const handleFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxSize = 10 * 1024 * 1024, // 10MB default
    folder = 'vvd',
    multiple = false
  } = options;

  return async (req, res, next) => {
    try {
      if (!req.files) {
        return res.status(400).json({
          status: 'error',
          message: 'No files uploaded'
        });
      }

      const files = multiple ? 
        (Array.isArray(req.files.files) ? req.files.files : [req.files.files]) :
        [req.files.file || req.files[Object.keys(req.files)[0]]];

      // Validate each file
      for (const file of files) {
        if (!validateFileType(file, allowedTypes)) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`
          });
        }

        if (!validateFileSize(file, maxSize)) {
          return res.status(400).json({
            status: 'error',
            message: `File too large: ${file.name}. Maximum size: ${maxSize / 1024 / 1024}MB`
          });
        }
      }

      // Upload files
      let uploadResult;
      if (multiple) {
        uploadResult = await uploadMultipleFiles(files, folder);
      } else {
        uploadResult = await uploadSingleFile(files[0], folder);
      }

      if (!uploadResult.success) {
        return res.status(500).json({
          status: 'error',
          message: 'File upload failed',
          details: uploadResult.error
        });
      }

      // Attach upload result to request
      req.uploadResult = uploadResult;
      next();
    } catch (error) {
      console.error('File upload middleware error:', error);
      res.status(500).json({
        status: 'error',
        message: 'File upload failed'
      });
    }
  };
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteFile,
  validateFileType,
  validateFileSize,
  handleFileUpload
};