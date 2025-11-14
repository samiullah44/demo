// pages/CollectionDetail.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ExternalLink, 
  Search, 
  Users, 
  Hash, 
  Sparkles,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  Twitter,
  Globe,
  MessageCircle,
  Package,
  AlertCircle
} from 'lucide-react';
import useCollectionStore from '../store/collectionStore';
import collectionsData from '../static/collections.json';
import InscriptionModal from '../components/InscriptionModal';

// ============================================
// CONSTANTS
// ============================================

const DEBOUNCE_DELAY = 300;
const IMAGE_LOAD_TIMEOUT = 10000;
const ITEMS_PER_PAGE = 40; // Load 40 items at a time for better performance
const PRELOAD_THRESHOLD = 5; // Start loading next batch when 5 items from end

// ============================================
// UTILITIES & CACHING
// ============================================

/**
 * Enhanced Image Cache with LRU eviction
 */
class ImageCache {
  constructor(maxSize = 500) {
    this.cache = new Map();
    this.loading = new Set();
    this.timeouts = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  get(url) {
    const cached = this.cache.get(url);
    if (cached) {
      // Move to end (most recently used)
      this.accessOrder = this.accessOrder.filter(u => u !== url);
      this.accessOrder.push(url);
    }
    return cached;
  }

  set(url, data) {
    // Implement LRU eviction
    if (this.cache.size >= this.maxSize && !this.cache.has(url)) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
        const timeout = this.timeouts.get(oldest);
        if (timeout) {
          clearTimeout(timeout);
          this.timeouts.delete(oldest);
        }
      }
    }

    this.cache.set(url, data);
    this.loading.delete(url);
    this.accessOrder.push(url);
    
    const existingTimeout = this.timeouts.get(url);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.timeouts.delete(url);
    }
  }

  has(url) {
    return this.cache.has(url);
  }

  isLoading(url) {
    return this.loading.has(url);
  }

  setLoading(url) {
    this.loading.add(url);
    
    const timeout = setTimeout(() => {
      if (this.loading.has(url)) {
        this.set(url, { error: true });
      }
    }, IMAGE_LOAD_TIMEOUT);
    
    this.timeouts.set(url, timeout);
  }

  clear() {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    this.cache.clear();
    this.loading.clear();
    this.accessOrder = [];
  }

  getStats() {
    return {
      size: this.cache.size,
      loading: this.loading.size,
      maxSize: this.maxSize
    };
  }
}

const imageCache = new ImageCache(500);

/**
 * Debounced search hook
 */
const useDebouncedSearch = (initialValue = '', delay = DEBOUNCE_DELAY) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return [value, debouncedValue, setValue];
};

/**
 * Infinite scroll hook with preloading
 */
const useInfiniteScroll = (hasMore, isLoading, loadMore, threshold = PRELOAD_THRESHOLD) => {
  const observerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: `${threshold * 100}px` // Preload before reaching end
      }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, loadMore, threshold]);

  return observerRef;
};

// ============================================
// MEMOIZED CHILD COMPONENTS
// ============================================

/**
 * Content Type Icon Component
 */
const ContentTypeIcon = React.memo(({ contentType }) => {
  const icon = useMemo(() => {
    if (contentType?.includes('image')) return <ImageIcon className="h-4 w-4" />;
    if (contentType?.includes('video')) return <Video className="h-4 w-4" />;
    if (contentType?.includes('audio')) return <Music className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  }, [contentType]);

  return <div className="flex-shrink-0 text-cyan-400">{icon}</div>;
});

ContentTypeIcon.displayName = 'ContentTypeIcon';

/**
 * Meta Tags Component - Optimized
 */
const MetaTags = React.memo(({ meta }) => {
  const displayData = useMemo(() => {
    if (!meta || Object.keys(meta).length === 0) return null;

    const entries = Object.entries(meta);
    const displayEntries = entries.slice(0, 3);
    const remainingCount = entries.length - 3;

    return { displayEntries, remainingCount };
  }, [meta]);

  if (!displayData) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {displayData.displayEntries.map(([key, value]) => (
        <span
          key={key}
          className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-1 rounded"
          title={`${key}: ${value}`}
        >
          {key}: {String(value).slice(0, 10)}
          {String(value).length > 10 ? '...' : ''}
        </span>
      ))}
      {displayData.remainingCount > 0 && (
        <span 
          className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded"
          title={`${displayData.remainingCount} more properties`}
        >
          +{displayData.remainingCount} more
        </span>
      )}
    </div>
  );
});

MetaTags.displayName = 'MetaTags';

/**
 * Collection Links Component
 */
const CollectionLinks = React.memo(({ collectionData }) => {
  const links = useMemo(() => {
    if (!collectionData) return null;
    
    const { twitter_link, discord_link, website_link } = collectionData;
    return { twitter_link, discord_link, website_link };
  }, [collectionData]);

  if (!links || (!links.twitter_link && !links.discord_link && !links.website_link)) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3 mt-3">
      {links.twitter_link && (
        <a
          href={links.twitter_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors duration-300"
          title="Twitter"
        >
          <Twitter className="h-4 w-4" />
          <span className="text-sm">Twitter</span>
        </a>
      )}
      {links.discord_link && (
        <a
          href={links.discord_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 transition-colors duration-300"
          title="Discord"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm">Discord</span>
        </a>
      )}
      {links.website_link && (
        <a
          href={links.website_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors duration-300"
          title="Website"
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm">Website</span>
        </a>
      )}
    </div>
  );
});

CollectionLinks.displayName = 'CollectionLinks';

/**
 * Collection Icon Component
 */
const CollectionIcon = React.memo(({ collectionData, className = "h-16 w-16" }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const imageUrl = useMemo(() => 
    collectionData?.inscription_icon 
      ? `https://ordinals.com/content/${collectionData.inscription_icon}`
      : null,
    [collectionData?.inscription_icon]
  );

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    if (imageUrl) imageCache.set(imageUrl, { loaded: true });
  }, [imageUrl]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    if (imageUrl) imageCache.set(imageUrl, { error: true });
  }, [imageUrl]);

  // Check cache on mount
  useEffect(() => {
    if (imageUrl) {
      const cached = imageCache.get(imageUrl);
      if (cached?.loaded) setImageLoaded(true);
      if (cached?.error) setImageError(true);
    }
  }, [imageUrl]);

  if (!imageUrl || imageError) {
    return (
      <div className={`${className} bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-400/30`}>
        <Package className="h-8 w-8 text-cyan-400" />
      </div>
    );
  }

  return (
    <div className={`${className} relative rounded-xl overflow-hidden border border-cyan-400/30`}>
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
        </div>
      )}
      <img
        src={imageUrl}
        alt={collectionData?.name || 'Collection icon'}
        className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="eager"
      />
    </div>
  );
});

CollectionIcon.displayName = 'CollectionIcon';

/**
 * Collection Stats Component
 */
const CollectionStats = React.memo(({ collection, staticData, visibleCount, totalCount }) => {
  const formattedSupply = useMemo(() => 
    staticData?.supply ? parseInt(staticData.supply).toLocaleString() : null,
    [staticData?.supply]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
    >
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-cyan-400/20 p-4 text-center">
        <div className="text-cyan-400 text-sm font-semibold">Total Items</div>
        <div className="text-white text-2xl font-bold">
          {totalCount}
        </div>
      </div>
      
      {formattedSupply && (
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-cyan-400/20 p-4 text-center">
          <div className="text-cyan-400 text-sm font-semibold">Total Supply</div>
          <div className="text-white text-2xl font-bold">{formattedSupply}</div>
        </div>
      )}
      
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-cyan-400/20 p-4 text-center">
        <div className="text-cyan-400 text-sm font-semibold">Collection Slug</div>
        <div className="text-white text-lg font-mono truncate" title={collection.slug}>
          {collection.slug}
        </div>
      </div>
      
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-cyan-400/20 p-4 text-center">
        <div className="text-cyan-400 text-sm font-semibold">Source</div>
        <div className="text-white text-lg capitalize">
          {collection.source || 'database'}
        </div>
      </div>
    </motion.div>
  );
});

CollectionStats.displayName = 'CollectionStats';

/**
 * Optimized Inscription Card with Intersection Observer
 */
const InscriptionCard = React.memo(({ inscription, index, onInscriptionClick, isVisible }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(isVisible);
  const cardRef = useRef(null);
  
  const imageUrl = useMemo(() => 
    `https://ordinals.com/content/${inscription.id}`,
    [inscription.id]
  );

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!cardRef.current || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    );

    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, [shouldLoad]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    imageCache.set(imageUrl, { loaded: true });
  }, [imageUrl]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    imageCache.set(imageUrl, { error: true });
  }, [imageUrl]);

  const handleCardClick = useCallback(() => {
    onInscriptionClick(inscription);
  }, [inscription, onInscriptionClick]);

  // Check cache on mount
  useEffect(() => {
    if (shouldLoad) {
      const cached = imageCache.get(imageUrl);
      if (cached?.loaded) setImageLoaded(true);
      if (cached?.error) setImageError(true);
      else if (!cached) imageCache.setLoading(imageUrl);
    }
  }, [imageUrl, shouldLoad]);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.2,
        delay: Math.min(index * 0.02, 0.3)
      }}
      className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-cyan-400/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer group"
      onClick={handleCardClick}
    >
      {/* Inscription Image */}
      <div className="aspect-square bg-gray-900/50 relative overflow-hidden rounded-t-xl">
        {shouldLoad ? (
          !imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              )}
              <img
                src={imageUrl}
                alt={inscription.meta?.name || inscription.id}
                loading="lazy"
                className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center p-4">
                <Sparkles className="h-8 w-8 text-cyan-400/50 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">View Details</p>
              </div>
            </div>
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50">
          <div className="text-center">
            <ExternalLink className="h-6 w-6 text-cyan-400 mx-auto mb-1" />
            <span className="text-white font-semibold text-sm">View Details</span>
          </div>
        </div>
      </div>

      {/* Inscription Info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 
            className="text-white font-semibold text-sm truncate flex-1 mr-2"
            title={inscription.meta?.name || inscription.id}
          >
            {inscription.meta?.name || 'Inscription'}
          </h3>
          {inscription.meta?.content_type && (
            <ContentTypeIcon contentType={inscription.meta.content_type} />
          )}
        </div>
        
        <p 
          className="text-gray-400 text-xs truncate font-mono mb-2"
          title={inscription.id}
        >
          {inscription.id.slice(0, 8)}...{inscription.id.slice(-8)}
        </p>

        <MetaTags meta={inscription.meta} />
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.inscription.id === nextProps.inscription.id &&
    prevProps.index === nextProps.index &&
    prevProps.isVisible === nextProps.isVisible
  );
});

InscriptionCard.displayName = 'InscriptionCard';

/**
 * Loading State Component
 */
const LoadingState = React.memo(({ slug }) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black pt-20 flex items-center justify-center">
    <div className="text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"
      />
      <p className="text-cyan-300 text-lg">Loading collection...</p>
      <p className="text-gray-400 text-sm mt-2">Fetching {slug}</p>
    </div>
  </div>
));

LoadingState.displayName = 'LoadingState';

/**
 * Error State Component
 */
const ErrorState = React.memo(({ error, onBack }) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black pt-20 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto px-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="bg-red-500/20 border border-red-400/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"
      >
        <AlertCircle className="h-8 w-8 text-red-400" />
      </motion.div>
      <h2 className="text-2xl font-bold text-white mb-2">Collection Not Found</h2>
      <p className="text-gray-300 mb-6">{error}</p>
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors duration-300 mx-auto bg-gray-800/50 hover:bg-gray-700/50 px-4 py-2 rounded-lg border border-cyan-400/20"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Collections</span>
      </button>
    </div>
  </div>
));

ErrorState.displayName = 'ErrorState';

/**
 * Empty Collection State
 */
const EmptyCollectionState = React.memo(({ collectionName, onBack }) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black pt-20 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto px-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="bg-cyan-500/20 border border-cyan-400/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"
      >
        <Package className="h-8 w-8 text-cyan-400" />
      </motion.div>
      <h2 className="text-2xl font-bold text-white mb-2">No Inscriptions Yet</h2>
      <p className="text-gray-300 mb-2">
        The collection "{collectionName}" doesn't have any inscriptions yet.
      </p>
      <p className="text-gray-400 text-sm mb-6">
        Check back later or explore other collections.
      </p>
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors duration-300 mx-auto bg-gray-800/50 hover:bg-gray-700/50 px-4 py-2 rounded-lg border border-cyan-400/20"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Collections</span>
      </button>
    </div>
  </div>
));

EmptyCollectionState.displayName = 'EmptyCollectionState';

/**
 * Empty Search State
 */
const EmptySearchState = React.memo(({ searchTerm }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-16"
  >
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-12 max-w-md mx-auto">
      <Search className="h-16 w-16 text-cyan-400/50 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">No inscriptions found</h3>
      <p className="text-gray-400">
        No results for "{searchTerm}". Try different search terms.
      </p>
    </div>
  </motion.div>
));

EmptySearchState.displayName = 'EmptySearchState';

/**
 * Search Bar Component
 */
const SearchBar = React.memo(({ searchTerm, onSearchChange, resultsCount, isSearching }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="mb-8"
  >
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      <input
        type="text"
        placeholder="Search inscriptions by name or ID..."
        value={searchTerm}
        onChange={onSearchChange}
        className="w-full pl-10 pr-20 py-3 bg-gray-800/50 border border-cyan-400/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400/40 focus:bg-gray-800/70 transition-all duration-300 backdrop-blur-xl"
        autoComplete="off"
      />
      {searchTerm && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
          ) : (
            <div className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded">
              {resultsCount} results
            </div>
          )}
        </div>
      )}
    </div>
  </motion.div>
));

SearchBar.displayName = 'SearchBar';

/**
 * Load More Indicator
 */
const LoadMoreIndicator = React.memo(() => (
  <div className="flex justify-center py-8">
    <div className="flex items-center space-x-3 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 px-6 py-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
      <span className="text-cyan-400 font-semibold">Loading more inscriptions...</span>
    </div>
  </div>
));

LoadMoreIndicator.displayName = 'LoadMoreIndicator';

/**
 * All Loaded Indicator
 */
const AllLoadedIndicator = React.memo(({ count }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-8"
  >
    <div className="bg-green-500/20 border border-green-400/30 rounded-2xl px-6 py-4 inline-block">
      <span className="text-green-400 font-semibold">
        🎉 All {count} inscriptions loaded!
      </span>
    </div>
  </motion.div>
));

AllLoadedIndicator.displayName = 'AllLoadedIndicator';

// ============================================
// MAIN COLLECTION DETAIL COMPONENT
// ============================================

const CollectionDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const {
    currentCollection,
    loading,
    error,
    fetchCollection
  } = useCollectionStore();
  
  // State
  const [searchInput, debouncedSearchTerm, setSearchInput] = useDebouncedSearch('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedInscription, setSelectedInscription] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Refs
  const isMounted = useRef(true);

  // Get static collection data
  const staticCollectionData = useMemo(() => 
    collectionsData.find(collection => collection.slug === slug),
    [slug]
  );

  // Fetch collection when slug changes
  useEffect(() => {
    isMounted.current = true;
    
    if (slug) {
      fetchCollection(slug).catch(() => {
        // Error handled by store
      });
    }

    return () => {
      isMounted.current = false;
    };
  }, [slug, fetchCollection]);

  // Preprocess inscriptions for search (memoized)
  const processedInscriptions = useMemo(() => {
    if (!currentCollection?.inscriptions) return [];
    
    console.log(`📊 Processing ${currentCollection.inscriptions.length} inscriptions...`);
    
    return currentCollection.inscriptions.map(inscription => ({
      ...inscription,
      searchKey: `${inscription.meta?.name?.toLowerCase() || ''} ${inscription.id.toLowerCase()}`
    }));
  }, [currentCollection?.inscriptions]);

  // Filter inscriptions based on search
  const filteredInscriptions = useMemo(() => {
    if (!debouncedSearchTerm) return processedInscriptions;
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    const filtered = processedInscriptions.filter(inscription =>
      inscription.searchKey.includes(searchLower)
    );
    
    console.log(`🔍 Filtered to ${filtered.length} inscriptions`);
    return filtered;
  }, [processedInscriptions, debouncedSearchTerm]);

  // Visible inscriptions (virtual scrolling)
  const visibleInscriptions = useMemo(() => 
    filteredInscriptions.slice(0, visibleCount),
    [filteredInscriptions, visibleCount]
  );

  // Load more callback
  const loadMore = useCallback(() => {
    if (isLoadingMore || visibleCount >= filteredInscriptions.length) return;

    setIsLoadingMore(true);
    
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        if (isMounted.current) {
          setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredInscriptions.length));
          setIsLoadingMore(false);
        }
      });
    } else {
      setTimeout(() => {
        if (isMounted.current) {
          setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredInscriptions.length));
          setIsLoadingMore(false);
        }
      }, 100);
    }
  }, [isLoadingMore, visibleCount, filteredInscriptions.length]);

  // Infinite scroll hook
  const observerRef = useInfiniteScroll(
    visibleCount < filteredInscriptions.length,
    isLoadingMore,
    loadMore
  );

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [debouncedSearchTerm]);

  // Callbacks
  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, [setSearchInput]);

  const handleBackClick = useCallback(() => {
    navigate('/collections');
  }, [navigate]);

  const handleInscriptionClick = useCallback((inscription) => {
    setSelectedInscription(inscription);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // Clear selected inscription after modal closes
    setTimeout(() => {
      setSelectedInscription(null);
    }, 300);
  }, []);

  // Cleanup image cache on unmount
  useEffect(() => {
    return () => {
      imageCache.clear();
    };
  }, []);

  // Performance monitoring (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📈 CollectionDetail Performance:', {
        slug,
        totalInscriptions: currentCollection?.inscriptions?.length || 0,
        filteredCount: filteredInscriptions.length,
        visibleCount: visibleInscriptions.length,
        searchTerm: debouncedSearchTerm,
        loading,
        error: !!error,
        cacheStats: imageCache.getStats()
      });
    }
  }, [
    slug, 
    currentCollection, 
    filteredInscriptions.length, 
    visibleInscriptions.length, 
    debouncedSearchTerm, 
    loading, 
    error
  ]);

  // Render loading state
  if (loading) {
    return <LoadingState slug={slug} />;
  }

  // Render error state
  if (error) {
    return <ErrorState error={error} onBack={handleBackClick} />;
  }

  // Render no collection state
  if (!currentCollection) {
    return <ErrorState error="Collection not found in database" onBack={handleBackClick} />;
  }

  // Render empty collection state
  if (!currentCollection.inscriptions || currentCollection.inscriptions.length === 0) {
    return (
      <EmptyCollectionState 
        collectionName={currentCollection.name || slug}
        onBack={handleBackClick}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8"
        >
          <div className="flex items-start space-x-4 flex-1">
            <CollectionIcon collectionData={staticCollectionData} />
            
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h1 
                    className="text-2xl lg:text-3xl font-bold text-white truncate"
                    title={currentCollection.name}
                  >
                    {currentCollection.name}
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <Hash className="h-4 w-4 text-cyan-300 flex-shrink-0" />
                    <p className="text-cyan-300 truncate" title={slug}>{slug}</p>
                  </div>
                  
                  {/* Description */}
                  {staticCollectionData?.description && (
                    <p className="text-gray-300 mt-3 text-sm leading-relaxed max-w-2xl">
                      {staticCollectionData.description}
                    </p>
                  )}

                  {/* Collection Links */}
                  <CollectionLinks collectionData={staticCollectionData} />
                </div>

                {/* Items Count */}
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-gray-400 text-lg font-semibold">
                    {currentCollection.inscriptions?.length.toLocaleString() || 0} inscriptions
                  </p>
                  {staticCollectionData?.supply && (
                    <p className="text-cyan-400 text-sm mt-1">
                      {parseInt(staticCollectionData.supply).toLocaleString()} total supply
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleBackClick}
              className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-all duration-300 bg-gray-800/50 hover:bg-gray-700/50 px-4 py-2 rounded-lg border border-cyan-400/20"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Collections</span>
            </button>
          </div>
        </motion.div>

        {/* Collection Stats */}
        <CollectionStats 
          collection={currentCollection} 
          staticData={staticCollectionData}
          visibleCount={visibleInscriptions.length}
          totalCount={filteredInscriptions.length}
        />

        {/* Search Bar */}
        <SearchBar 
          searchTerm={searchInput}
          onSearchChange={handleSearchChange}
          resultsCount={filteredInscriptions.length}
          isSearching={searchInput !== debouncedSearchTerm}
        />

        {/* Inscriptions Grid */}
        {visibleInscriptions.length > 0 ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {visibleInscriptions.map((inscription, index) => (
                <InscriptionCard
                  key={inscription.id}
                  inscription={inscription}
                  index={index}
                  onInscriptionClick={handleInscriptionClick}
                  isVisible={index < ITEMS_PER_PAGE}
                />
              ))}
            </motion.div>

            {/* Load More Indicator */}
            {visibleCount < filteredInscriptions.length && (
              <div ref={observerRef}>
                <LoadMoreIndicator />
              </div>
            )}

            {/* All Loaded Indicator */}
            {visibleCount >= filteredInscriptions.length && filteredInscriptions.length > ITEMS_PER_PAGE && (
              <AllLoadedIndicator count={filteredInscriptions.length} />
            )}
          </>
        ) : (
          <EmptySearchState searchTerm={debouncedSearchTerm} />
        )}
      </div>

      {/* Inscription Modal */}
      <AnimatePresence>
        {isModalOpen && selectedInscription && (
          <InscriptionModal
            inscription={selectedInscription}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(CollectionDetail);