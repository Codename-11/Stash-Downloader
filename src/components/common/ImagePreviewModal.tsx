/**
 * MediaPreviewModal - Modal for viewing full-size media previews (images and videos)
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface MediaPreviewModalProps {
  open: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  alt?: string;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  open,
  onClose,
  mediaUrl,
  mediaType = 'image',
  alt = 'Preview',
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  // Alias for backwards compatibility
  const imageUrl = mediaUrl;

  // Reset loading state when URL changes
  React.useEffect(() => {
    if (open) {
      setLoading(true);
      setError(false);
    }
  }, [mediaUrl, open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0, 0, 0, 0.9)',
          boxShadow: 24,
        },
      }}
    >
      {/* Close button */}
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: 'white',
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.7)',
          },
          zIndex: 1,
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        {/* Loading spinner */}
        {loading && !error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, gap: 2 }}>
            <CircularProgress sx={{ color: 'white' }} />
            <Typography sx={{ color: 'white' }}>Loading {mediaType}...</Typography>
          </Box>
        )}

        {/* Image */}
        {mediaType === 'image' && (
          <Box
            component="img"
            src={imageUrl}
            alt={alt}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            sx={{
              maxWidth: '100%',
              maxHeight: '85vh',
              objectFit: 'contain',
              cursor: 'zoom-in',
              display: error ? 'none' : 'block',
            }}
            onClick={(e) => {
              // Allow clicking image to open in new tab
              e.stopPropagation();
              window.open(imageUrl, '_blank');
            }}
          />
        )}

        {/* Video */}
        {mediaType === 'video' && (
          <Box
            sx={{
              width: '100%',
              maxWidth: '100%',
              display: error ? 'none' : 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: 2,
            }}
          >
            <Box
              component="video"
              src={mediaUrl}
              controls
              autoPlay
              onLoadedData={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}>
              Right-click video to download or open in new tab
            </Typography>
          </Box>
        )}

        {/* Error message */}
        {error && (
          <Box sx={{ color: 'white', p: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Failed to load {mediaType}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              The {mediaType} URL may be invalid or require authentication
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Backwards compatibility export
export const ImagePreviewModal = MediaPreviewModal;
