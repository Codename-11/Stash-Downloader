/**
 * MediaPreviewModal - Modal for viewing full-size media previews (images and videos)
 */

import React, { useEffect } from 'react';

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

  const imageUrl = mediaUrl;

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(false);
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [mediaUrl, open]);

  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }} onClick={onClose} />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1055 }}
      >
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content" style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', border: 'none' }}>
            <button
              type="button"
              className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
              onClick={onClose}
              aria-label="Close"
              style={{ zIndex: 1 }}
            />

            <div className="modal-body p-0 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '400px' }}>
              {loading && !error && (
                <div className="d-flex flex-column align-items-center justify-content-center p-4 gap-2">
                  <div className="spinner-border text-light" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-white mb-0">Loading {mediaType}...</p>
                </div>
              )}

              {mediaType === 'image' && (
                <img
                  src={imageUrl}
                  alt={alt}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError(true);
                  }}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '85vh',
                    objectFit: 'contain',
                    cursor: 'zoom-in',
                    display: error ? 'none' : 'block',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(imageUrl, '_blank');
                  }}
                />
              )}

              {mediaType === 'video' && (
                <div
                  className="w-100 d-flex flex-column align-items-center p-2"
                  style={{ display: error ? 'none' : 'flex' }}
                >
                  <video
                    src={mediaUrl}
                    controls
                    autoPlay
                    onLoadedData={() => setLoading(false)}
                    onError={() => {
                      setLoading(false);
                      setError(true);
                    }}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '80vh',
                      objectFit: 'contain',
                    }}
                  />
                  <p className="text-white-50 small mt-2 mb-0">
                    Right-click video to download or open in new tab
                  </p>
                </div>
              )}

              {error && (
                <div className="text-white p-4 text-center">
                  <h6 className="mb-2">Failed to load {mediaType}</h6>
                  <p className="text-white-50 small mb-0">
                    The {mediaType} URL may be invalid or require authentication
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Backwards compatibility export
export const ImagePreviewModal = MediaPreviewModal;
