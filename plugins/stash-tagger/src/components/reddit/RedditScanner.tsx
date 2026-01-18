/**
 * RedditScanner - Scan and auto-tag Reddit content
 */

import React, { useState } from 'react';
import { useRedditMetadataScan, type RedditMetadataMatch } from '@/hooks';
import { stashService } from '@/services/StashService';

interface BatchResult {
  id: string;
  title?: string;
  found: boolean;
  metadata?: RedditMetadataMatch;
  error?: string;
}

export const RedditScanner: React.FC = () => {
  const { scanning, scanScene, scanGallery } = useRedditMetadataScan();
  const [itemId, setItemId] = useState('');
  const [itemType, setItemType] = useState<'scene' | 'gallery'>('scene');
  const [result, setResult] = useState<{ found: boolean; metadata?: RedditMetadataMatch; error?: string } | null>(null);
  
  // Batch scanning state
  const [batchScanning, setBatchScanning] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchLimit, setBatchLimit] = useState(100);

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

  const handleBatchScan = async () => {
    setBatchScanning(true);
    setBatchResults([]);
    setBatchProgress({ current: 0, total: 0 });

    try {
      // Get all scenes or galleries
      let itemList: Array<{ id: string; title?: string; path?: string }> = [];
      
      if (itemType === 'scene') {
        const data = await stashService.getScenes(batchLimit, 1);
        itemList = data.scenes;
      } else {
        const data = await stashService.getGalleries(batchLimit, 1);
        itemList = data.galleries;
      }

      const totalItems = Math.min(itemList.length, batchLimit);

      setBatchProgress({ current: 0, total: totalItems });

      const results: BatchResult[] = [];

      for (let i = 0; i < totalItems; i++) {
        const item = itemList[i];
        if (!item) continue;

        try {
          const scanResult = itemType === 'scene'
            ? await scanScene(item.id)
            : await scanGallery(item.id);

          results.push({
            id: item.id,
            title: item.title,
            found: scanResult.found,
            metadata: scanResult.metadata,
            error: scanResult.error,
          });
        } catch (error) {
          results.push({
            id: item.id,
            title: item.title,
            found: false,
            error: String(error),
          });
        }

        setBatchProgress({ current: i + 1, total: totalItems });
        setBatchResults([...results]);

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Batch scan error:', error);
    } finally {
      setBatchScanning(false);
      setBatchProgress(null);
    }
  };

  const foundCount = batchResults.filter(r => r.found).length;

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

      {/* Mode Selection */}
      <div className="mb-3">
        <div className="btn-group w-100" role="group">
          <input
            type="radio"
            className="btn-check"
            name="scanMode"
            id="modeSingle"
            checked={batchResults.length === 0}
            onChange={() => setBatchResults([])}
          />
          <label className="btn btn-outline-primary" htmlFor="modeSingle">
            Single Scan
          </label>
          
          <input
            type="radio"
            className="btn-check"
            name="scanMode"
            id="modeBatch"
            checked={batchResults.length > 0 || batchScanning}
            onChange={() => { /* Will show batch UI */ }}
          />
          <label className="btn btn-outline-primary" htmlFor="modeBatch">
            Batch Scan
          </label>
        </div>
      </div>

      {/* Single Scan */}
      {batchResults.length === 0 && !batchScanning && (
        <>
          <div className="card bg-dark border-secondary mb-3">
            <div className="card-body">
              <h6 className="card-title text-light mb-3">Scan Single {itemType === 'scene' ? 'Scene' : 'Gallery'}</h6>
              
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

          {/* Single Scan Results */}
          {result && (
            <div className="card bg-dark border-secondary mb-3">
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
                          This file doesn't have embedded Reddit metadata.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Batch Scan */}
      {(batchResults.length > 0 || batchScanning) && (
        <>
          <div className="card bg-dark border-secondary mb-3">
            <div className="card-body">
              <h6 className="card-title text-light mb-3">Batch Scan {itemType === 'scene' ? 'Scenes' : 'Galleries'}</h6>
              
              <div className="mb-3">
                <label className="form-label small text-muted">Type</label>
                <div className="btn-group w-100 mb-2" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="batchItemType"
                    id="batchTypeScene"
                    checked={itemType === 'scene'}
                    onChange={() => setItemType('scene')}
                    disabled={batchScanning}
                  />
                  <label className="btn btn-outline-secondary" htmlFor="batchTypeScene">
                    Scenes
                  </label>
                  
                  <input
                    type="radio"
                    className="btn-check"
                    name="batchItemType"
                    id="batchTypeGallery"
                    checked={itemType === 'gallery'}
                    onChange={() => setItemType('gallery')}
                    disabled={batchScanning}
                  />
                  <label className="btn btn-outline-secondary" htmlFor="batchTypeGallery">
                    Galleries
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">Scan Limit</label>
                <input
                  type="number"
                  className="form-control form-control-sm bg-dark text-light border-secondary"
                  value={batchLimit}
                  onChange={(e) => setBatchLimit(Math.max(1, Math.min(1000, parseInt(e.target.value) || 100)))}
                  min="1"
                  max="1000"
                  disabled={batchScanning}
                />
                <small className="text-muted">
                  Scan up to {batchLimit} most recent {itemType}s (max: 1000)
                </small>
              </div>

              {batchProgress && (
                <div className="mb-3">
                  <div className="progress" style={{ height: '25px' }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated"
                      role="progressbar"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    >
                      {batchProgress.current} / {batchProgress.total}
                    </div>
                  </div>
                </div>
              )}

              <div className="d-flex gap-2">
                <button
                  className="btn btn-primary"
                  onClick={handleBatchScan}
                  disabled={batchScanning}
                >
                  {batchScanning ? '🔍 Scanning...' : '🔍 Start Batch Scan'}
                </button>
                {batchResults.length > 0 && !batchScanning && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setBatchResults([])}
                  >
                    Clear Results
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Batch Results */}
          {batchResults.length > 0 && (
            <div className="card bg-dark border-secondary">
              <div className="card-body">
                <h6 className="card-title text-light mb-3">
                  Batch Results: {foundCount} / {batchResults.length} with Reddit metadata
                </h6>

                <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="table table-dark table-sm table-hover">
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#30404d', zIndex: 1 }}>
                      <tr>
                        <th style={{ width: '80px' }}>ID</th>
                        <th>Title</th>
                        <th style={{ width: '120px' }}>Status</th>
                        <th>Performer</th>
                        <th>Studio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResults.map((result) => (
                        <tr key={result.id} className={result.found ? 'table-success' : ''}>
                          <td>
                            <a href={`/${itemType}s/${result.id}`} target="_blank" rel="noopener noreferrer" className="text-light">
                              {result.id}
                            </a>
                          </td>
                          <td className="text-truncate" style={{ maxWidth: '300px' }}>
                            {result.title || <em className="text-muted">No title</em>}
                          </td>
                          <td>
                            {result.found ? (
                              <span className="badge bg-success">✅ Found</span>
                            ) : (
                              <span className="badge bg-secondary">❌ Not found</span>
                            )}
                          </td>
                          <td>
                            {result.metadata?.performer || <span className="text-muted">—</span>}
                          </td>
                          <td>
                            {result.metadata?.studio || <span className="text-muted">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
