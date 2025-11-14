// components/InscriptionModal.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ExternalLink, 
  FileText,
  Copy,
  CheckCircle,
  Image as ImageIcon,
  Calendar,
  User,
  Hash,
  X
} from 'lucide-react';

/**
 * Inscription Modal Component
 */
const InscriptionModal = ({ inscription, isOpen, onClose }) => {
  const [inscriptionData, setInscriptionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState('');
  const [imageError, setImageError] = useState(false);

  // Fetch inscription details when modal opens
  useEffect(() => {
    if (isOpen && inscription) {
      const fetchInscriptionData = async () => {
        setLoading(true);
        setError(null);
        setImageError(false);
        try {
          const { getInscriptionDataById } = await import('../lib/ordinalsService');
          const data = await getInscriptionDataById(inscription.id);
          setInscriptionData(data);
        } catch (err) {
          setError(err.message);
          console.error('Error fetching inscription details:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchInscriptionData();
    }
  }, [isOpen, inscription]);

  // Close handler
  const handleClose = useCallback(() => {
    onClose();
    // Reset state after animation
    setTimeout(() => {
      setInscriptionData(null);
      setError(null);
      setImageError(false);
      setCopiedField('');
    }, 300);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Copy to clipboard function
  const copyToClipboard = useCallback(async (text, field) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Format sats
  const formatSats = useCallback((sats) => {
    if (!sats) return '0';
    return parseInt(sats).toLocaleString();
  }, []);

  // Get content type icon
  const getContentTypeIcon = useCallback((contentType) => {
    if (contentType?.includes('image')) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  }, []);

  // Memoized image URL
  const imageUrl = useMemo(() => 
    `https://ordinals.com/content/${inscription?.id}`, 
    [inscription?.id]
  );

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-cyan-400/20 max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-cyan-400/20 bg-gray-900/50">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {inscriptionData?.content_type && (
              <div className="flex-shrink-0">
                {getContentTypeIcon(inscriptionData.content_type)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold text-white truncate">
                {inscription.meta?.name || inscriptionData?.number || 'Inscription Details'}
              </h2>
              {inscriptionData?.number && (
                <p className="text-cyan-300 text-sm font-semibold">
                  Inscription #{inscriptionData.number}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3 flex-shrink-0">
            <a
              href={`https://ordinals.com/inscription/${inscription.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all duration-300"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Explorer</span>
            </a>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300 rounded-lg hover:bg-gray-700/50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <p className="text-cyan-300 text-lg">Loading inscription details...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="bg-red-500/20 border border-red-400/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Failed to Load Details</h3>
              <p className="text-gray-400 max-w-md mx-auto">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all duration-300"
              >
                Try Again
              </button>
            </div>
          ) : inscriptionData ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 p-6">
              {/* Left Column - Image/Content Preview */}
              <div className="space-y-6">
                <div className="bg-gray-900/50 rounded-xl border border-cyan-400/20 p-6">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4">Preview</h3>
                  <div className="aspect-square bg-gray-800/50 rounded-lg flex items-center justify-center border-2 border-dashed border-cyan-400/20 overflow-hidden">
                    {!imageError ? (
                      <img
                        src={imageUrl}
                        alt={inscription.meta?.name || inscription.id}
                        className="w-full h-full object-contain"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="text-center p-8">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-cyan-400/50" />
                        <p className="text-gray-400">Preview not available</p>
                        <p className="text-gray-500 text-sm mt-2">
                          {inscriptionData.content_type || 'Unknown content type'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex space-x-3">
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-cyan-500/20 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all duration-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View Content</span>
                  </a>
                  <button
                    onClick={() => copyToClipboard(inscription.id, 'id')}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-purple-500/20 border border-purple-400/30 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-all duration-300"
                  >
                    {copiedField === 'id' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span>Copy ID</span>
                  </button>
                </div>
              </div>

              {/* Right Column - Details */}
              <div className="space-y-6">
                <div className="bg-gray-900/50 rounded-xl border border-cyan-400/20 p-6">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4">Inscription Details</h3>
                  
                  <div className="space-y-4">
                    {/* Basic Information */}
                    <div className="space-y-3">
                      <h4 className="text-cyan-300 font-medium text-sm">Basic Information</h4>
                      {inscriptionData.number && (
                        <DetailItem
                          label="Inscription Number"
                          value={`#${inscriptionData.number}`}
                          icon={<Hash className="h-4 w-4" />}
                        />
                      )}
                      {inscriptionData.content_type && (
                        <DetailItem
                          label="Content Type"
                          value={inscriptionData.content_type}
                          onCopy={() => copyToClipboard(inscriptionData.content_type, 'contentType')}
                          copied={copiedField === 'contentType'}
                        />
                      )}
                      {inscriptionData.timestamp && (
                        <DetailItem
                          label="Timestamp"
                          value={formatTimestamp(inscriptionData.timestamp)}
                          icon={<Calendar className="h-4 w-4" />}
                        />
                      )}
                    </div>

                    {/* Ownership & Technical */}
                    <div className="space-y-3">
                      <h4 className="text-cyan-300 font-medium text-sm">Ownership & Technical</h4>
                      {inscriptionData.address && (
                        <DetailItem
                          label="Address"
                          value={inscriptionData.address}
                          onCopy={() => copyToClipboard(inscriptionData.address, 'address')}
                          copied={copiedField === 'address'}
                          icon={<User className="h-4 w-4" />}
                          truncate
                        />
                      )}
                      {inscriptionData.id && (
                        <DetailItem
                          label="Inscription ID"
                          value={inscriptionData.id}
                          onCopy={() => copyToClipboard(inscriptionData.id, 'id')}
                          copied={copiedField === 'id'}
                          truncate
                        />
                      )}
                      {inscriptionData['output value'] && (
                        <DetailItem
                          label="Output Value"
                          value={`${formatSats(inscriptionData['output value'])} sats`}
                          onCopy={() => copyToClipboard(inscriptionData['output value'], 'value')}
                          copied={copiedField === 'value'}
                        />
                      )}
                    </div>

                    {/* Additional Metadata from API */}
                    {Object.keys(inscriptionData).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-cyan-300 font-medium text-sm">Additional Data</h4>
                        {Object.entries(inscriptionData)
                          .filter(([key]) => !['number', 'content_type', 'timestamp', 'address', 'id', 'output value'].includes(key))
                          .map(([key, value]) => (
                            <DetailItem
                              key={key}
                              label={key.replace(/_/g, ' ')}
                              value={String(value)}
                              onCopy={() => copyToClipboard(String(value), key)}
                              copied={copiedField === key}
                            />
                          ))
                        }
                      </div>
                    )}

                    {/* Custom Metadata from Collection */}
                    {inscription.meta && Object.keys(inscription.meta).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-cyan-300 font-medium text-sm">Collection Metadata</h4>
                        {Object.entries(inscription.meta).map(([key, value]) => (
                          <DetailItem
                            key={key}
                            label={key}
                            value={String(value)}
                            onCopy={() => copyToClipboard(String(value), `meta-${key}`)}
                            copied={copiedField === `meta-${key}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Raw Data (Collapsible) */}
                <div className="bg-gray-900/50 rounded-xl border border-cyan-400/20 p-6">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer text-cyan-400 hover:text-cyan-300 transition-colors duration-300 list-none">
                      <span className="font-medium">View Raw Data</span>
                      <div className="transform group-open:rotate-180 transition-transform duration-300">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="mt-4 bg-gray-800/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <pre className="text-sm text-gray-300">
                        {JSON.stringify(
                          { 
                            ...inscriptionData, 
                            collectionMeta: inscription.meta 
                          }, 
                          null, 2
                        )}
                      </pre>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * Detail Item Component
 */
const DetailItem = React.memo(({ label, value, onCopy, copied, icon, truncate = false }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
    <div className="flex items-center space-x-2 min-w-0 flex-1">
      {icon && <div className="text-gray-500 flex-shrink-0">{icon}</div>}
      <span className="text-gray-400 font-medium text-sm flex-shrink-0">{label}:</span>
    </div>
    <div className="flex items-center space-x-2 min-w-0 justify-end flex-1">
      <span className={`text-white text-sm text-right ${truncate ? 'truncate max-w-[200px]' : 'break-all'}`}>
        {value || 'N/A'}
      </span>
      {onCopy && value && (
        <button
          onClick={onCopy}
          className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors duration-200 flex-shrink-0"
          title={`Copy ${label}`}
        >
          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  </div>
));

DetailItem.displayName = 'DetailItem';

export default InscriptionModal;