import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  Image,
  FileText,
  Calendar,
  User,
  Hash
} from 'lucide-react';

const InscriptionDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [inscriptionData, setInscriptionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    if (location.state?.inscriptionData) {
      setInscriptionData(location.state.inscriptionData);
    } else {
      // If no data passed, redirect back to home
      navigate('/');
    }
  }, [location, navigate]);

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getContentTypeIcon = (contentType) => {
    if (contentType?.startsWith('image/')) {
      return <Image className="h-5 w-5" />;
    }
    if (contentType?.startsWith('text/')) {
      return <FileText className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  if (!inscriptionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black pt-20 flex items-center justify-center">
        <div className="text-white text-lg">Loading inscription data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black pt-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors duration-300"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image/Content Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
              <div className="flex items-center space-x-3 mb-4">
                {getContentTypeIcon(inscriptionData.contentType)}
                <h2 className="text-xl font-bold text-white">Preview</h2>
              </div>
              
              <div className="aspect-square bg-gray-700/50 rounded-xl flex items-center justify-center border border-cyan-400/10">
                {inscriptionData.contentType?.startsWith('image/') ? (
                  <img
                    src={`https://ordinals.com/content/${inscriptionData.id || inscriptionData.number}`}
                    alt={`Inscription ${inscriptionData.number}`}
                    className="rounded-lg max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="text-gray-400 text-center p-4">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Content Type: {inscriptionData.contentType || 'Unknown'}</p>
                  <p className="text-sm mt-2">Preview not available</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Hash className="h-8 w-8 text-cyan-400" />
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      Inscription #{inscriptionData.number}
                    </h1>
                    <p className="text-cyan-300">Ordinal Inscription</p>
                  </div>
                </div>
                
                <a
                  href={`https://ordinals.com/inscription/${inscriptionData.id || inscriptionData.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-cyan-400 hover:bg-cyan-500/30 transition-all duration-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View on Explorer</span>
                </a>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-cyan-400 border-b border-cyan-400/20 pb-2">
                    Basic Information
                  </h3>
                  
                  <DetailItem
                    label="Inscription Number"
                    value={inscriptionData.number}
                    onCopy={() => copyToClipboard(inscriptionData.number, 'number')}
                    copied={copiedField === 'number'}
                  />
                  
                  <DetailItem
                    label="Content Type"
                    value={inscriptionData.contentType || 'Unknown'}
                    onCopy={() => copyToClipboard(inscriptionData.contentType, 'contentType')}
                    copied={copiedField === 'contentType'}
                  />
                  
                  <DetailItem
                    label="Timestamp"
                    value={inscriptionData.timestamp || 'Unknown'}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                </div>

                {/* Ownership & Technical */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-cyan-400 border-b border-cyan-400/20 pb-2">
                    Ownership & Technical
                  </h3>
                  
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
                      value={inscriptionData['output value']}
                      onCopy={() => copyToClipboard(inscriptionData['output value'], 'value')}
                      copied={copiedField === 'value'}
                    />
                  )}
                </div>
              </div>

              {/* Additional Metadata */}
              {Object.keys(inscriptionData).length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-cyan-400 border-b border-cyan-400/20 pb-2 mb-4">
                    Full Metadata
                  </h3>
                  <div className="bg-gray-900/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <pre className="text-sm text-gray-300">
                      {JSON.stringify(inscriptionData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Detail Item Component
const DetailItem = ({ label, value, onCopy, copied, icon, truncate = false }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
    <div className="flex items-center space-x-2">
      {icon}
      <span className="text-gray-400 font-medium">{label}:</span>
    </div>
    <div className="flex items-center space-x-2">
      <span className={`text-white ${truncate ? 'truncate max-w-[200px]' : ''}`}>
        {value}
      </span>
      {onCopy && (
        <button
          onClick={onCopy}
          className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
        >
          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  </div>
);

export default InscriptionDetail;