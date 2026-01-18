/**
 * RedditScanner - Scan and auto-tag Reddit content
 */

import React, { useState } from 'react';
import { useRedditMetadataScan } from '@/hooks';

export const RedditScanner: React.FC = () => {
  const { scanning, scanScene, scanGallery } = useRedditMetadataScan();
  const [itemId, setItemId] = useState('');
  const [itemType, setItemType] = useState<'scene' | 'gallery'>('scene');
  const [result, setResult] = useState<{ found: boolean; metadata?: any; error?: string } | null>(null);

  const handleScan = async () => {
    if (!itemId.trim()) return;
    
    setResult(null);
    const scanResult = itemType === 'scene' 
      ? await scanScene(itemId.trim())
      : await scanGallery(itemId.trim());
    setResult(scanResult);
  };

  const handleClear = () => {
    setItemId('');
    setResult(null);
  };

  return (
    <div>
      <div className="mb-4">
        <h5 className="text-light mb-3">Reddit Metadata Scanner</h5>
        <p className="text-muted small mb-3">
          Scan scenes and galleries for embedded Reddit metadata from redditdownloader or stash-downloader.
          Automatically extract performer (u/username), studio (r/subreddit), and tags.
        </p>

        {/* Prerequisites Alert */}
        <div className="alert alert-info" role="alert">
          <strong>📋 Requirements:</strong>
          <ul className="mb-0 small mt-2">
            <li><strong>stash-downloader plugin</strong> must be installed (provides EXIF backend)</li>
            <li>Files must have embedded metadata (from redditdownloader or stash-downloader)</li>
            <li>Supported: JPEG, PNG, MP4, MOV, M4V</li>
          </ul>
        </div>
      </div>

      {/* Scan Input */}
      <div className="card bg-dark border-secondary mb-3">
        <div className="card-body">
          <h6 className="card-title text-light mb-3">Scan Scene/Gallery</h6>
          
          <div className="mb-3">
            <label className="form-label small text-muted">Type</label>
            <div className="btn-group w-100 mb-2" role="group">
              <input
                type="radio"
                className="btn-check"
                name="itemType"
                id="typeScene"
                checked={itemType === 'scene'}
                onChange={() => setItemType('scene')}
              />
              <label className="btn btn-outline-secondary" htmlFor="typeScene">
                Scene
              </label>
              
              <input
                type="radio"
                className="btn-check"
                name="itemType"
                id="typeGallery"
                checked={itemType === 'gallery'}
                onChange={() => setItemType('gallery')}
              />
              <label className="btn btn-outline-secondary" htmlFor="typeGallery">
                Gallery
              </label>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label small text-muted">
              {itemType === 'scene' ? 'Scene' : 'Gallery'} ID
            </label>
            <div className="input-group">
              <input
                type="text"
                className="form-control bg-dark text-light border-secondary"
                placeholder={`Enter ${itemType} ID (e.g., 123)`}
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                disabled={scanning}
              />
              <button
                className="btn btn-primary"
                onClick={handleScan}
                disabled={scanning || !itemId.trim()}
              >
                {scanning ? '🔍 Scanning...' : '🔍 Scan'}
              </button>
              {itemId && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={handleClear}
                  disabled={scanning}
                >
                  Clear
                </button>
              )}
            </div>
            <small className="text-muted">
              You can find the ID in the URL: /{itemType}s/<strong>123</strong>
            </small>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="card bg-dark border-secondary">
          <div className="card-body">
            <h6 className="card-title text-light mb-3">Scan Results</h6>

            {result.found && result.metadata ? (
              <div>
                <div className="alert alert-success" role="alert">
                  <strong>✅ Reddit metadata found!</strong>
                </div>

                <div className="table-responsive">
                  <table className="table table-dark table-sm">
                    <tbody>
                      {result.metadata.performer && (
                        <tr>
                          <th className="text-muted" style={{ width: '150px' }}>Performer</th>
                          <td className="text-light">
                            <strong>{result.metadata.performer}</strong>
                            <small className="text-muted ms-2">
                              (from Reddit author)
                            </small>
                          </td>
                        </tr>
                      )}
                      {result.metadata.studio && (
                        <tr>
                          <th className="text-muted">Studio</th>
                          <td className="text-light">
                            <strong>{result.metadata.studio}</strong>
                            <small className="text-muted ms-2">
                              (from subreddit)
                            </small>
                          </td>
                        </tr>
                      )}
                      {result.metadata.tags && result.metadata.tags.length > 0 && (
                        <tr>
                          <th className="text-muted">Tags</th>
                          <td>
                            {result.metadata.tags.map((tag: string) => (
                              <span key={tag} className="badge bg-secondary me-1">
                                {tag}
                              </span>
                            ))}
                          </td>
                        </tr>
                      )}
                      {result.metadata.title && (
                        <tr>
                          <th className="text-muted">Title</th>
                          <td className="text-light">{result.metadata.title}</td>
                        </tr>
                      )}
                      {result.metadata.url && (
                        <tr>
                          <th className="text-muted">URL</th>
                          <td>
                            <a
                              href={result.metadata.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary"
                            >
                              {result.metadata.url}
                            </a>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="alert alert-warning mt-3" role="alert">
                  <strong>💡 Next Steps:</strong>
                  <p className="mb-0 small mt-2">
                    Use the extracted information to:
                  </p>
                  <ul className="small mb-0 mt-2">
                    <li>Create/link performer in Performers tab</li>
                    <li>Create/link studio in Studios tab</li>
                    <li>Add tags in Tags tab</li>
                  </ul>
                  <p className="mb-0 small mt-2 text-muted">
                    (Auto-tagging will be added in a future update)
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {result.error ? (
                  <div className="alert alert-danger" role="alert">
                    <strong>❌ Error:</strong> {result.error}
                  </div>
                ) : (
                  <div className="alert alert-warning" role="alert">
                    <strong>ℹ️ No Reddit metadata found</strong>
                    <p className="mb-0 small mt-2">
                      This file either doesn't have embedded Reddit metadata, or:
                    </p>
                    <ul className="small mb-0 mt-2">
                      <li>File wasn't downloaded with metadata embedding enabled</li>
                      <li>File is not from Reddit</li>
                      <li>File was edited (metadata stripped)</li>
                      <li>File type doesn't support metadata (not JPEG/PNG/MP4/MOV)</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Usage Guide */}
      <div className="mt-4">
        <h6 className="text-light mb-3">How It Works</h6>
        <div className="text-muted small">
          <ol>
            <li className="mb-2">
              <strong>Find a scene or gallery</strong> that was downloaded from Reddit using:
              <ul>
                <li>The <code>stash-downloader</code> plugin (with "Embed Reddit Metadata" enabled)</li>
                <li>The <code>redditdownloader</code> project</li>
              </ul>
            </li>
            <li className="mb-2">
              <strong>Enter the scene/gallery ID</strong> from the URL bar
            </li>
            <li className="mb-2">
              <strong>Click Scan</strong> - the scanner will read EXIF/FFmpeg metadata from the file
            </li>
            <li className="mb-2">
              <strong>Use the extracted data</strong> to manually tag the content in Stash
            </li>
          </ol>

          <div className="alert alert-secondary mt-3" role="alert">
            <strong>💡 Tip:</strong> You can test this with any Reddit content you've previously downloaded 
            that has embedded metadata. The scanner works on existing files - no re-download needed!
          </div>
        </div>
      </div>
    </div>
  );
};
