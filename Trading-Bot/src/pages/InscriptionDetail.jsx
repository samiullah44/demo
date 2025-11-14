import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  User,
  Hash,
  Bitcoin,
  Link as LinkIcon,
  Layers,
  DollarSign,
  Clock,
  Download,
  ZoomIn,
  File
} from 'lucide-react';

/**
 * Format timestamp to readable date
 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format satoshis with thousand separators
 */
const formatSats = (sats) => {
  if (!sats) return '0';
  return parseInt(sats).toLocaleString();
};

/**
 * Get appropriate icon for content type
 */
const getContentTypeIcon = (contentType) => {
  if (contentType?.includes('image')) {
    return <ImageIcon className="h-5 w-5 text-cyan-400" />;
  }
  if (contentType?.includes('video')) {
    return <Video className="h-5 w-5 text-cyan-400" />;
  }
  if (contentType?.includes('audio')) {
    return <Music className="h-5 w-5 text-cyan-400" />;
  }
  if (contentType?.includes('text')) {
    return <FileText className="h-5 w-5 text-cyan-400" />;
  }
  return <File className="h-5 w-5 text-cyan-400" />;
};

// ============================================
// CUSTOM HOOKS
// ============================================

/**
 * Custom hook for fetching inscription data with caching
 */
const useInscriptionData = (id) => {
  const [inscriptionData, setInscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastFetchedId = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const fetchInscriptionData = async () => {
      // Prevent duplicate fetch for same ID
      if (lastFetchedId.current === id && inscriptionData) {
        console.log('⚡ Data already loaded for:', id);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        const { getInscriptionDataById } = await import('../lib/ordinalsService');
        const data = await getInscriptionDataById(id);
        
        if (isMounted.current) {
          setInscriptionData(data);
          lastFetchedId.current = id;
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err.message || 'Failed to fetch inscription data');
          console.error('Error fetching inscription:', err);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchInscriptionData();
    }

    return () => {
      isMounted.current = false;
    };
  }, [id]);

  return { inscriptionData, loading, error };
};

/**
 * Custom hook for clipboard operations
 */
const useClipboard = () => {
  const [copiedField, setCopiedField] = useState('');

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

  return { copiedField, copyToClipboard };
};

// ============================================
// CHILD COMPONENTS
// ============================================

/**
 * Text Content Preview Component
 */
const TextContentPreview = React.memo(({ contentUrl, showFull, onToggleFull }) => {
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const contentCache = useRef(new Map());

  useEffect(() => {
    const fetchTextContent = async () => {
      // Check cache first
      if (contentCache.current.has(contentUrl)) {
        setTextContent(contentCache.current.get(contentUrl));
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(contentUrl);
        const text = await response.text();
        setTextContent(text);
        contentCache.current.set(contentUrl, text);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTextContent();
  }, [contentUrl]);

  const displayText = useMemo(() => {
    return showFull ? textContent : textContent.slice(0, 1000);
  }, [textContent, showFull]);

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="animate-pulse">
          <FileText className="h-12 w-12 mx-auto mb-4 text-cyan-400/50" />
          <p className="text-gray-400">Loading text content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <FileText className="h-12 w-12 mx-auto mb-4 text-red-400/50" />
        <p className="text-gray-400">Failed to load text content</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gray-900/50 rounded-lg p-6 max-h-96 overflow-y-auto">
        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
          {displayText}
          {!showFull && textContent.length > 1000 && '...'}
        </pre>
      </div>
      {textContent.length > 1000 && (
        <button
          onClick={onToggleFull}
          className="mt-4 px-4 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all duration-300"
        >
          {showFull ? 'Show Less' : 'Show Full Content'}
        </button>
      )}
    </div>
  );
});

TextContentPreview.displayName = 'TextContentPreview';

/**
 * Detail Section Component
 */
const DetailSection = React.memo(({ title, icon, children }) => (
  <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-700/50">
    <div className="flex items-center space-x-2 mb-3">
      {icon}
      <h3 className="font-semibold text-cyan-400">{title}</h3>
    </div>
    <div className="space-y-3">
      {children}
    </div>
  </div>
));

DetailSection.displayName = 'DetailSection';

/**
 * Detail Item Component
 */
const DetailItem = React.memo(({ label, value, onCopy, copied, icon, truncate = false }) => (
  <div className="flex items-start justify-between">
    <div className="flex items-start space-x-2 min-w-0 flex-1">
      {icon && <div className="mt-1 text-gray-500 flex-shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-400 mb-1">{label}</div>
        <div className={`text-white text-sm ${truncate ? 'truncate' : 'break-all'}`}>
          {value || 'N/A'}
        </div>
      </div>
    </div>
    {onCopy && value && (
      <button
        onClick={onCopy}
        className="ml-2 p-1 text-cyan-400 hover:text-cyan-300 transition-colors duration-200 flex-shrink-0"
        title={`Copy ${label}`}
      >
        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    )}
  </div>
));

DetailItem.displayName = 'DetailItem';

/**
 * Loading State Component
 */
const LoadingState = React.memo(({ id }) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black pt-20 flex items-center justify-center">
    <div className="text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"
      />
      <p className="text-cyan-300 text-lg">Loading inscription data...</p>
      <p className="text-gray-400 text-sm mt-2">Fetching details for #{id}</p>
    </div>
  </div>
));

LoadingState.displayName = 'LoadingState';

/**
 * Error State Component
 */
const ErrorState = React.memo(({ error, onGoBack }) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black pt-20 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto px-4">
      <div className="bg-red-500/20 border border-red-400/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
        <FileText className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Inscription Not Found</h2>
      <p className="text-gray-300 mb-6">{error || 'The requested inscription could not be found.'}</p>
      <button
        onClick={onGoBack}
        className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors duration-300 mx-auto"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Go Back</span>
      </button>
    </div>
  </div>
));

ErrorState.displayName = 'ErrorState';

/**
 * Content Preview Component
 */
const ContentPreview = React.memo(({ 
  contentUrl, 
  contentType, 
  inscriptionNumber, 
  contentLength,
  onContentError,
  onZoomImage,
  showFullText,
  onToggleFullText
}) => {
  const [contentError, setContentError] = useState(false);
   const { id } = useParams();
 const { inscriptionData, loading, error } = useInscriptionData(id);
  const handleError = useCallback(() => {
    setContentError(true);
    onContentError?.();
  }, [onContentError]);

  if (contentError) {
    return (
      <div className="text-center p-8">
        <FileText className="h-20 w-20 mx-auto mb-4 text-cyan-400/50" />
        <p className="text-gray-400 mb-2">Preview not available</p>
        <p className="text-sm text-gray-500">{contentType || 'Unknown content type'}</p>
        {contentLength && <p className="text-sm text-gray-500 mt-1">{contentLength}</p>}
      </div>
    );
  }

  const lowerContentType = contentType?.toLowerCase() || '';

  // Image
  if (lowerContentType.includes('image')) {
    return (
      <div className="relative group">
        <motion.img
          src={contentUrl}
          alt={`Inscription ${inscriptionNumber}`}
          className="rounded-lg max-w-full max-h-96 object-contain mx-auto cursor-pointer hover:scale-105 transition-transform duration-300"
          onError={handleError}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          onClick={onZoomImage}
        />
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={onZoomImage}
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // Video
  if (lowerContentType.includes('video')) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <video controls className="w-full rounded-lg" onError={handleError}>
          <source src={contentUrl} type={contentType} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // Audio
  if (lowerContentType.includes('audio')) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gray-900/50 rounded-lg p-6">
          <Music className="h-12 w-12 mx-auto mb-4 text-cyan-400" />
          <audio controls className="w-full" onError={handleError}>
            <source src={contentUrl} type={contentType} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      </div>
    );
  }

  // Text
  if (lowerContentType.includes('text')) {
    return (
      <TextContentPreview 
        contentUrl={contentUrl}
        showFull={showFullText}
        onToggleFull={onToggleFullText}
      />
    );
  }

  // Default fallback
  return (
    <div className="text-center p-8">
      <File className="h-20 w-20 mx-auto mb-4 text-cyan-400/50" />
      <p className="text-gray-400 mb-2">Unsupported Content Type</p>
      <p className="text-sm text-gray-500 mb-4">{lowerContentType}</p>
      <a
        href={contentUrl}
        download
        className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all duration-300"
      >
        <Download className="h-4 w-4" />
        <span>Download Content</span>
      </a>
    </div>
  );
});

ContentPreview.displayName = 'ContentPreview';

/**
 * Image Zoom Modal Component
 */
const ImageZoomModal = React.memo(({ isOpen, contentUrl, inscriptionNumber, onClose }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full">
        <img
          src={contentUrl}
          alt={`Inscription ${inscriptionNumber}`}
          className="max-w-full max-h-full object-contain"
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
});

ImageZoomModal.displayName = 'ImageZoomModal';

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * Main Inscription Detail Component
 */
const InscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Custom hooks
  const { inscriptionData, loading, error } = useInscriptionData(id);
  const { copiedField, copyToClipboard } = useClipboard();
  
  // Local state
  const [contentError, setContentError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  // Memoized values
  const contentUrl = useMemo(() => {
    return `https://ordinals.com/content/${inscriptionData?.id || id}`;
  }, [inscriptionData?.id, id]);

  const formattedTimestamp = useMemo(() => 
    formatTimestamp(inscriptionData?.timestamp), 
    [inscriptionData?.timestamp]
  );

  const formattedValue = useMemo(() => 
    formatSats(inscriptionData?.value), 
    [inscriptionData?.value]
  );

  const formattedFee = useMemo(() => 
    formatSats(inscriptionData?.fee), 
    [inscriptionData?.fee]
  );

  const formattedSat = useMemo(() => 
    formatSats(inscriptionData?.sat), 
    [inscriptionData?.sat]
  );

  const formattedHeight = useMemo(() => 
    formatSats(inscriptionData?.height), 
    [inscriptionData?.height]
  );

  // Callbacks
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleZoomToggle = useCallback(() => {
    setIsZoomed(prev => !prev);
  }, []);

  const handleToggleFullText = useCallback(() => {
    setShowFullText(prev => !prev);
  }, []);

  const handleContentError = useCallback(() => {
    setContentError(true);
  }, []);

  // Render states
  if (loading) {
    return <LoadingState id={id} />;
  }

  if (error || !inscriptionData) {
    return <ErrorState error={error} onGoBack={handleGoBack} />;
  }

  // Main render
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <button
              onClick={handleGoBack}
              className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-all duration-300 bg-gray-800/50 hover:bg-gray-700/50 px-4 py-2 rounded-lg border border-cyan-400/20"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Previous</span>
            </button>
          </motion.div>

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Content Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="xl:col-span-2"
            >
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    {getContentTypeIcon(inscriptionData.content_type)}
                    <div>
                      <h2 className="text-xl font-bold text-white">Content Preview</h2>
                      <p className="text-cyan-300 text-sm">
                        {inscriptionData.content_type || 'Unknown type'}
                        {inscriptionData['content length'] && ` • ${inscriptionData['content length']}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-full">
                    <Hash className="h-4 w-4 text-cyan-400" />
                    <span className="text-cyan-400 font-medium">#{inscriptionData.number}</span>
                  </div>
                </div>
                
                {/* Content Preview Area */}
                <div className="min-h-[400px] flex items-center justify-center bg-gray-900/50 rounded-xl border-2 border-dashed border-cyan-400/20 p-4">
                  <ContentPreview
                    contentUrl={contentUrl}
                    contentType={inscriptionData.content_type}
                    inscriptionNumber={inscriptionData.number}
                    contentLength={inscriptionData['content length']}
                    onContentError={handleContentError}
                    onZoomImage={handleZoomToggle}
                    showFullText={showFullText}
                    onToggleFullText={handleToggleFullText}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <a
                    href={contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-cyan-500/20 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all duration-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View Original Content</span>
                  </a>
                  <a
                    href={`https://ordinals.com/inscription/${inscriptionData.id || id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-purple-500/20 border border-purple-400/30 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-all duration-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View on Explorer</span>
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="xl:col-span-1"
            >
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6 h-full">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Hash className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">
                        #{inscriptionData.number}
                      </h1>
                      <p className="text-cyan-300">Ordinal Inscription</p>
                    </div>
                  </div>
                  
                  {inscriptionData.timestamp && (
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>{formattedTimestamp}</span>
                    </div>
                  )}
                </div>

                {/* Details Sections */}
                <div className="space-y-6">
                  {/* Ownership Section */}
                  <DetailSection 
                    title="Ownership" 
                    icon={<User className="h-5 w-5" />}
                  >
                    {inscriptionData.address && (
                      <DetailItem
                        label="Owner Address"
                        value={inscriptionData.address}
                        onCopy={() => copyToClipboard(inscriptionData.address, 'address')}
                        copied={copiedField === 'address'}
                        icon={<User className="h-4 w-4" />}
                        truncate
                      />
                    )}
                    {inscriptionData['ethereum teleburn address'] && (
                      <DetailItem
                        label="Ethereum Teleburn"
                        value={inscriptionData['ethereum teleburn address']}
                        onCopy={() => copyToClipboard(inscriptionData['ethereum teleburn address'], 'eth')}
                        copied={copiedField === 'eth'}
                        truncate
                      />
                    )}
                  </DetailSection>

                  {/* Financial Section */}
                  <DetailSection 
                    title="Financial" 
                    icon={<Bitcoin className="h-5 w-5" />}
                  >
                    {inscriptionData.value && (
                      <DetailItem
                        label="Value"
                        value={`${formattedValue} sats`}
                        onCopy={() => copyToClipboard(inscriptionData.value, 'value')}
                        copied={copiedField === 'value'}
                        icon={<DollarSign className="h-4 w-4" />}
                      />
                    )}
                    {inscriptionData.fee && (
                      <DetailItem
                        label="Fee"
                        value={`${formattedFee} sats`}
                        onCopy={() => copyToClipboard(inscriptionData.fee, 'fee')}
                        copied={copiedField === 'fee'}
                        icon={<DollarSign className="h-4 w-4" />}
                      />
                    )}
                    {inscriptionData.sat && (
                      <DetailItem
                        label="Sat Number"
                        value={formattedSat}
                        onCopy={() => copyToClipboard(inscriptionData.sat, 'sat')}
                        copied={copiedField === 'sat'}
                        icon={<Layers className="h-4 w-4" />}
                      />
                    )}
                    {inscriptionData['sat name'] && (
                      <DetailItem
                        label="Sat Name"
                        value={inscriptionData['sat name']}
                        onCopy={() => copyToClipboard(inscriptionData['sat name'], 'satname')}
                        copied={copiedField === 'satname'}
                      />
                    )}
                  </DetailSection>

                  {/* Technical Section */}
                  <DetailSection 
                    title="Technical" 
                    icon={<FileText className="h-5 w-5" />}
                  >
                    {inscriptionData.content_type && (
                      <DetailItem
                        label="Content Type"
                        value={inscriptionData.content_type}
                        onCopy={() => copyToClipboard(inscriptionData.content_type, 'contentType')}
                        copied={copiedField === 'contentType'}
                      />
                    )}
                    {inscriptionData['content length'] && (
                      <DetailItem
                        label="Content Length"
                        value={inscriptionData['content length']}
                      />
                    )}
                    {inscriptionData.height && (
                      <DetailItem
                        label="Block Height"
                        value={formattedHeight}
                      />
                    )}
                  </DetailSection>

                  {/* Transaction Section */}
                  <DetailSection 
                    title="Transaction" 
                    icon={<LinkIcon className="h-5 w-5" />}
                  >
                    {inscriptionData.id && (
                      <DetailItem
                        label="Inscription ID"
                        value={inscriptionData.id}
                        onCopy={() => copyToClipboard(inscriptionData.id, 'id')}
                        copied={copiedField === 'id'}
                        truncate
                      />
                    )}
                    {inscriptionData['reveal transaction'] && (
                      <DetailItem
                        label="Reveal Tx"
                        value={inscriptionData['reveal transaction']}
                        onCopy={() => copyToClipboard(inscriptionData['reveal transaction'], 'reveal')}
                        copied={copiedField === 'reveal'}
                        truncate
                      />
                    )}
                    {inscriptionData.output && (
                      <DetailItem
                        label="Output"
                        value={inscriptionData.output}
                        onCopy={() => copyToClipboard(inscriptionData.output, 'output')}
                        copied={copiedField === 'output'}
                        truncate
                      />
                    )}
                    {inscriptionData.location && (
                      <DetailItem
                        label="Location"
                        value={inscriptionData.location}
                        onCopy={() => copyToClipboard(inscriptionData.location, 'location')}
                        copied={copiedField === 'location'}
                        truncate
                      />
                    )}
                  </DetailSection>
                </div>

                {/* Raw Data Toggle */}
                <div className="mt-8 pt-6 border-t border-gray-700/50">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer text-cyan-400 hover:text-cyan-300 transition-colors duration-300">
                      <span className="font-medium">View Raw Data</span>
                      <div className="transform group-open:rotate-180 transition-transform duration-300">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="mt-4 bg-gray-900/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <pre className="text-sm text-gray-300">
                        {JSON.stringify(inscriptionData, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={isZoomed}
        contentUrl={contentUrl}
        inscriptionNumber={inscriptionData.number}
        onClose={handleZoomToggle}
      />
    </>
  );
};

export default InscriptionDetail;
// // pages/InscriptionPage.js

// import React, { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import { getInscriptionDataById } from "../lib/ordinalsService";
// import { motion } from "framer-motion";

// export default function InscriptionDetail() {
//   const { id } = useParams();

//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState(null);

//   useEffect(() => {
//     async function fetchData() {
//       try {
//         const result = await getInscriptionDataById(id);
//         setData(result);
//       } catch (e) {
//         setErr(e.message);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchData();
//   }, [id]);

//   if (loading)
//     return <p className="text-center p-6 text-gray-500">Loading…</p>;

//   if (err)
//     return (
//       <p className="text-center p-6 text-red-600 font-semibold">
//         {err}
//       </p>
//     );

//   return (
//     <motion.div
//       className="max-w-3xl mx-auto p-6 space-y-4"
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//     >
//       <h1 className="text-2xl font-bold">Inscription #{data.number}</h1>

//       <div className="p-4 border rounded-lg shadow-sm bg-white">
//         {Object.entries(data).map(([key, value]) => (
//           <div className="flex justify-between py-2 border-b last:border-none" key={key}>
//             <span className="font-semibold">{key}</span>
//             <span className="text-gray-700">{value}</span>
//           </div>
//         ))}
//       </div>
//     </motion.div>
//   );
// }