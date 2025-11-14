import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ExternalLink, Users, Hash, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import your collections data
import collectionsData from '../static/collections.json';

/**
 * Debounce function to limit search input frequency
 */
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Image loading cache to prevent duplicate loads
 */
class ImageCache {
  constructor() {
    this.cache = new Map();
    this.loading = new Set();
  }

  isLoaded(url) {
    return this.cache.has(url);
  }

  isLoading(url) {
    return this.loading.has(url);
  }

  setLoaded(url) {
    this.cache.set(url, true);
    this.loading.delete(url);
  }

  setLoading(url) {
    this.loading.add(url);
  }

  setFailed(url) {
    this.cache.set(url, false);
    this.loading.delete(url);
  }
}

const imageCache = new ImageCache();

// ============================================
// MEMOIZED CHILD COMPONENTS
// ============================================

/**
 * Optimized Collection Card Component
 */
const CollectionCard = React.memo(({ collection, index }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageUrl = useMemo(
    () => `https://ordinals.com/content/${collection.inscription_icon}`,
    [collection.inscription_icon]
  );

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    imageCache.setLoaded(imageUrl);
  }, [imageUrl]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    imageCache.setFailed(imageUrl);
  }, [imageUrl]);

  const handleCardClick = useCallback(() => {
    navigate(`/collection/${collection.slug}`);
  }, [navigate, collection.slug]);

  const handleLinkClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const formattedSupply = useMemo(
    () => collection.supply ? parseInt(collection.supply).toLocaleString() : null,
    [collection.supply]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min((index % 10) * 0.05, 0.5) }}
      className="flex"
    >
      <div
        className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-cyan-400/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-[1.02] cursor-pointer group h-full overflow-hidden flex-1 max-w-sm mx-auto w-full"
        onClick={handleCardClick}
      >
        {/* Collection Image */}
        <div className="aspect-square bg-gray-900/50 relative overflow-hidden">
          {!imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              )}
              <img
                src={imageUrl}
                alt={collection.name}
                loading="lazy"
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <Sparkles className="h-8 w-8 text-cyan-400/50" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Supply Badge */}
          {formattedSupply && (
            <div className="absolute top-2 right-2 bg-cyan-500/20 backdrop-blur-sm border border-cyan-400/30 rounded-lg px-2 py-1">
              <span className="text-cyan-300 text-xs font-semibold">
                {formattedSupply} items
              </span>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50">
            <div className="text-center">
              <Sparkles className="h-6 w-6 text-cyan-400 mx-auto mb-1" />
              <span className="text-white font-semibold text-sm">View Collection</span>
            </div>
          </div>
        </div>

        {/* Collection Info */}
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-base font-bold text-white truncate flex-1 mr-2">
              {collection.name || 'Unnamed Collection'}
            </h3>
            <div className="flex space-x-1 flex-shrink-0">
              {collection.twitter_link && (
                <a
                  href={collection.twitter_link}
                  onClick={handleLinkClick}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
              )}
              {collection.website_link && (
                <a
                  href={collection.website_link}
                  onClick={handleLinkClick}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <p className="text-gray-300 text-xs line-clamp-2 mb-2 leading-relaxed">
            {collection.description || 'No description available.'}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <Hash className="h-3 w-3" />
              <span className="truncate max-w-[100px] text-xs">{collection.slug || 'no-slug'}</span>
            </div>

            {collection.discord_link && (
              <a
                href={collection.discord_link}
                onClick={handleLinkClick}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Users className="h-3 w-3" />
                <span className="text-xs">Community</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.collection.slug === nextProps.collection.slug &&
    prevProps.index === nextProps.index
  );
});

CollectionCard.displayName = 'CollectionCard';

/**
 * Loading Indicator Component
 */
const LoadingIndicator = React.memo(() => (
  <div className="flex justify-center py-8">
    <div className="flex items-center space-x-3 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 px-6 py-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
      <span className="text-cyan-400 font-semibold">Loading more collections...</span>
    </div>
  </div>
));

LoadingIndicator.displayName = 'LoadingIndicator';

/**
 * All Loaded Indicator Component
 */
const AllLoadedIndicator = React.memo(({ count }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-8"
  >
    <div className="bg-green-500/20 border border-green-400/30 rounded-2xl px-6 py-4 inline-block">
      <span className="text-green-400 font-semibold">
        🎉 All {count} collections loaded!
      </span>
    </div>
  </motion.div>
));

AllLoadedIndicator.displayName = 'AllLoadedIndicator';

/**
 * No Results Component
 */
const NoResults = React.memo(({ searchTerm }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-16"
  >
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-12 max-w-md mx-auto">
      <Search className="h-16 w-16 text-cyan-400/50 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">No collections found</h3>
      <p className="text-gray-400">
        {searchTerm
          ? `No results for "${searchTerm}". Try different search terms.`
          : 'Try adjusting your search terms or filters to find what you\'re looking for.'}
      </p>
    </div>
  </motion.div>
));

NoResults.displayName = 'NoResults';

// ============================================
// CUSTOM HOOKS
// ============================================

/**
 * Custom hook for debounced search
 */
const useDebouncedSearch = (initialValue = '', delay = 300) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [value, debouncedValue, setValue];
};

/**
 * Custom hook for infinite scroll
 */
const useInfiniteScroll = (hasMore, isLoading, loadMore) => {
  const observerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
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
  }, [hasMore, isLoading, loadMore]);

  return observerRef;
};

// ============================================
// MAIN COMPONENT
// ============================================

const Collections = () => {
  const navigate = useNavigate();
  
  // State management
  const [searchInput, debouncedSearchTerm, setSearchInput] = useDebouncedSearch('', 300);
  const [sortBy, setSortBy] = useState('name');
  const [visibleCount, setVisibleCount] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize collections data preprocessing
  const processedCollections = useMemo(() => {
    console.log('📊 Processing collections data...');
    return collectionsData.map(collection => ({
      ...collection,
      searchKey: `${collection.name?.toLowerCase() || ''} ${collection.slug?.toLowerCase() || ''}`,
      supplyNum: parseInt(collection.supply) || 0,
      timestampNum: collection.timestamp || 0
    }));
  }, []);

  // Filter and sort collections with optimized algorithm
  const filteredCollections = useMemo(() => {
    console.log('🔍 Filtering and sorting collections...');
    let filtered = processedCollections;

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(collection =>
        collection.searchKey.includes(searchLower)
      );
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'supply':
        sorted.sort((a, b) => b.supplyNum - a.supplyNum);
        break;
      case 'recent':
        sorted.sort((a, b) => b.timestampNum - a.timestampNum);
        break;
      default:
        break;
    }

    console.log(`✅ Filtered to ${sorted.length} collections`);
    return sorted;
  }, [processedCollections, debouncedSearchTerm, sortBy]);

  // Visible collections with virtualization
  const visibleCollections = useMemo(() => {
    return filteredCollections.slice(0, visibleCount);
  }, [filteredCollections, visibleCount]);

  // Load more callback
  const loadMore = useCallback(() => {
    if (isLoading || visibleCount >= filteredCollections.length) return;

    setIsLoading(true);
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        setVisibleCount(prev => Math.min(prev + 30, filteredCollections.length));
        setIsLoading(false);
      });
    } else {
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 30, filteredCollections.length));
        setIsLoading(false);
      }, 100);
    }
  }, [isLoading, visibleCount, filteredCollections.length]);

  // Infinite scroll hook
  const observerRef = useInfiniteScroll(
    visibleCount < filteredCollections.length,
    isLoading,
    loadMore
  );

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(30);
  }, [debouncedSearchTerm, sortBy]);

  // Callbacks
  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, [setSearchInput]);

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  // Performance monitoring (development only)
  useEffect(() => {
    console.log('📈 Performance Stats:', {
      totalCollections: collectionsData.length,
      filteredCollections: filteredCollections.length,
      visibleCollections: visibleCollections.length,
      searchTerm: debouncedSearchTerm,
      sortBy
    });
  }, [filteredCollections.length, visibleCollections.length, debouncedSearchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black pt-20">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Ordinals Collections
          </h1>
          <p className="text-cyan-300 text-lg max-w-2xl mx-auto">
            Discover unique collections inscribed on Bitcoin.
            Explore {collectionsData.length.toLocaleString()} digital artifacts that redefine ownership on the blockchain.
          </p>
        </motion.div>

        {/* Search and Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search collections by name or slug..."
              value={searchInput}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-cyan-400/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400/40 focus:bg-gray-800/70 transition-all duration-300 backdrop-blur-xl"
              autoComplete="off"
            />
            {searchInput && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded">
                  {filteredCollections.length} results
                </div>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="pl-10 pr-8 py-3 bg-gray-800/50 border border-cyan-400/20 rounded-xl text-white focus:outline-none focus:border-cyan-400/40 focus:bg-gray-800/70 transition-all duration-300 backdrop-blur-xl appearance-none cursor-pointer"
            >
              <option value="name">Sort by Name</option>
              <option value="supply">Sort by Supply</option>
              <option value="recent">Sort by Recent</option>
            </select>
          </div>
        </motion.div>

        {/* Collections Grid */}
        {visibleCollections.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4"
          >
            {visibleCollections.map((collection, index) => (
              <CollectionCard
                key={`${collection.slug}-${index}`}
                collection={collection}
                index={index}
              />
            ))}
          </motion.div>
        ) : (
          <NoResults searchTerm={debouncedSearchTerm} />
        )}

        {/* Loading indicator and observer target */}
        {visibleCount < filteredCollections.length && (
          <div ref={observerRef}>
            <LoadingIndicator />
          </div>
        )}

        {/* Show when all collections are loaded */}
        {visibleCount >= filteredCollections.length && filteredCollections.length > 0 && (
          <AllLoadedIndicator count={filteredCollections.length} />
        )}
      </div>
    </div>
  );
};

export default Collections;