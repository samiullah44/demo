// components/Leaderboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Trophy, 
  Crown, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Clock,
  Award,
  Users,
  BarChart3,
  LineChart,
  PieChart,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Zap,
  Target,
  Bitcoin,
  ShoppingCart,
  Eye,
  Package
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  getFeaturedCollections, 
  getLatestCollections, 
  getTopCollections,
  getCollectionAnalytics 
} from '../lib/collectionsService';
import useCollectionStore from '../store/collectionStore';
// ============================================
// ANIMATION VARIANTS
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -20 }
};

// ============================================
// REUSABLE COMPONENTS
// ============================================

const Input = React.forwardRef(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200 ${className}`}
    {...props}
  />
));

const Button = React.forwardRef(({ variant = 'default', className = '', ...props }, ref) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50';
  
  const variants = {
    default: 'bg-cyan-600 text-white hover:bg-cyan-700 border border-cyan-600',
    outline: 'border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:border-gray-500',
    ghost: 'text-gray-400 hover:text-white hover:bg-gray-800',
    premium: 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-700 hover:to-cyan-700 border-0'
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    />
  );
});

const Card = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-xl border border-gray-700 bg-gray-800/50 backdrop-blur-sm p-6 ${className}`}
    {...props}
  />
));

const Badge = ({ variant = 'default', children, className = '' }) => {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  
  const variants = {
    default: 'bg-gray-700 text-gray-200',
    premium: 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Tabs = ({ value, onValueChange, tabs, className = '' }) => (
  <div className={`flex space-x-1 rounded-lg bg-gray-800/50 p-1 ${className}`}>
    {tabs.map((tab) => (
      <button
        key={tab.value}
        onClick={() => onValueChange(tab.value)}
        className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
          value === tab.value
            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        {tab.icon && <tab.icon className="h-4 w-4" />}
        <span>{tab.label}</span>
      </button>
    ))}
  </div>
);

// ============================================
// TAB COMPONENTS
// ============================================

const FeaturedTab = ({ collections }) => {
  const medals = [
    { icon: Crown, color: 'text-yellow-400', bg: 'from-yellow-400 to-yellow-600', rank: 1 },
    { icon: Trophy, color: 'text-gray-300', bg: 'from-gray-400 to-gray-600', rank: 2 },
    { icon: Award, color: 'text-orange-400', bg: 'from-orange-400 to-orange-600', rank: 3 }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
    >
      {collections.map((collection, index) => {
        const medal = medals[index];
        const MedalIcon = medal.icon;
        
        return (
          <motion.div
            key={collection.slug}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <Card className="text-center p-8 relative overflow-hidden">
              {/* Medal Background Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${medal.bg} opacity-5`} />
              
              {/* Medal Icon */}
              <div className="relative mb-6">
                <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${medal.bg} flex items-center justify-center shadow-lg`}>
                  <MedalIcon className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <Badge variant="premium" className="text-xs">
                    #{index + 1}
                  </Badge>
                </div>
              </div>

              {/* Collection Info */}
              <div className="relative mb-6">
                <img
                  src={collection.image_url || '/api/placeholder/80/80'}
                  alt={collection.name}
                  className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-cyan-500 object-cover"
                />
                <h3 className="text-xl font-bold text-white mb-1">{collection.name}</h3>
                <p className="text-gray-400 text-sm mb-2">{collection.slug}</p>
                <Badge variant="info" className="text-xs capitalize">
                  {collection.category}
                </Badge>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Floor Price</p>
                  <div className="flex items-center justify-center space-x-1">
                    <Bitcoin className="h-3 w-3 text-amber-400" />
                    <p className="text-white font-semibold">{collection.floor_price.toFixed(4)}</p>
                  </div>
                  <p className={`text-xs ${collection.floor_price_24h_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {collection.floor_price_24h_change >= 0 ? '+' : ''}{collection.floor_price_24h_change.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">24h Volume</p>
                  <div className="flex items-center justify-center space-x-1">
                    <Bitcoin className="h-3 w-3 text-amber-400" />
                    <p className="text-white font-semibold">{collection.volume_24h.toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Sales</p>
                  <div className="flex items-center justify-center space-x-1">
                    <ShoppingCart className="h-3 w-3 text-cyan-400" />
                    <p className="text-white font-semibold">{collection.sales_24h}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Owners</p>
                  <div className="flex items-center justify-center space-x-1">
                    <Users className="h-3 w-3 text-purple-400" />
                    <p className="text-white font-semibold">{collection.num_owners}</p>
                  </div>
                </div>
              </div>

              {/* Sparkles Effect for Top Performer */}
              {index === 0 && (
                <div className="absolute top-4 right-4">
                  <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

const LatestTab = ({ collections }) => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    className="space-y-4"
  >
    {collections.map((collection, index) => (
      <motion.div
        key={collection.slug}
        variants={itemVariants}
        whileHover={{ scale: 1.01 }}
        className="group"
      >
        <Card className="p-4 hover:border-cyan-500/50 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={collection.image_url || '/api/placeholder/48/48'}
                  alt={collection.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="absolute -bottom-1 -right-1">
                  <Badge variant="info" className="text-xs capitalize">
                    {collection.category}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-white flex items-center">
                  {collection.name}
                  <span className="text-gray-400 text-sm ml-2">({collection.slug})</span>
                </h3>
                <p className="text-gray-400 text-sm flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Added {new Date(collection.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Bitcoin className="h-3 w-3 text-amber-400" />
                  <p className="text-white font-semibold">{collection.floor_price.toFixed(4)}</p>
                </div>
                <p className="text-gray-400 text-sm">Floor Price</p>
              </div>
              
              <div className="flex items-center space-x-2">
                {collection.floor_price_24h_change > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : collection.floor_price_24h_change < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                ) : (
                  <Target className="h-4 w-4 text-gray-400" />
                )}
                <span className={collection.floor_price_24h_change > 0 ? 'text-green-400' : collection.floor_price_24h_change < 0 ? 'text-red-400' : 'text-gray-400'}>
                  {collection.floor_price_24h_change > 0 ? '+' : ''}{collection.floor_price_24h_change.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    ))}
  </motion.div>
);

const AllTab = ({ collections, totalCollections, currentPage, itemsPerPage, onPageChange, sortBy, sortOrder, onSort }) => {
  const totalPages = Math.ceil(totalCollections / itemsPerPage);

  const SortableHeader = ({ column, children }) => (
    <button
      onClick={() => onSort(column)}
      className="flex items-center space-x-1 font-semibold text-gray-400 hover:text-white transition-colors"
    >
      <span>{children}</span>
      {sortBy === column && (
        sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
      )}
    </button>
  );

  return (
    <div>
      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-4 px-4">
                  <SortableHeader column="rank">Rank</SortableHeader>
                </th>
                <th className="text-left py-4 px-4">
                  <SortableHeader column="name">Collection</SortableHeader>
                </th>
                <th className="text-right py-4 px-4">
                  <SortableHeader column="floor_price">Floor Price</SortableHeader>
                </th>
                <th className="text-right py-4 px-4">
                  <SortableHeader column="volume_24h">24h Volume</SortableHeader>
                </th>
                <th className="text-right py-4 px-4">
                  <SortableHeader column="sales_24h">24h Sales</SortableHeader>
                </th>
                <th className="text-right py-4 px-4">
                  <SortableHeader column="floor_price_24h_change">24h Change</SortableHeader>
                </th>
                <th className="text-right py-4 px-4">
                  <SortableHeader column="num_owners">Owners</SortableHeader>
                </th>
                <th className="text-right py-4 px-4">
                  <SortableHeader column="total_supply">Supply</SortableHeader>
                </th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection, index) => (
                <motion.tr
                  key={collection.slug}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ backgroundColor: 'rgba(56, 189, 248, 0.05)' }}
                  className="border-b border-gray-700/50 last:border-0 group cursor-pointer transition-all duration-200"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">#{index + 1 + (currentPage - 1) * itemsPerPage}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={collection.image_url || '/api/placeholder/32/32'}
                        alt={collection.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center space-x-1">
                          <span className="text-white font-medium">{collection.name}</span>
                          <Badge variant="info" className="text-xs capitalize">
                            {collection.category}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm">{collection.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-4 px-4">
                    <div className="flex items-center justify-end space-x-1">
                      <Bitcoin className="h-3 w-3 text-amber-400" />
                      <span className="text-white font-semibold">{collection.floor_price.toFixed(4)}</span>
                    </div>
                  </td>
                  <td className="text-right py-4 px-4">
                    <div className="flex items-center justify-end space-x-1">
                      <Bitcoin className="h-3 w-3 text-amber-400" />
                      <span className="text-white">{collection.volume_24h.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="text-right py-4 px-4">
                    <div className="flex items-center justify-end space-x-1">
                      <ShoppingCart className="h-3 w-3 text-cyan-400" />
                      <span className="text-white">{collection.sales_24h}</span>
                    </div>
                  </td>
                  <td className="text-right py-4 px-4">
                    <span className={collection.floor_price_24h_change >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {collection.floor_price_24h_change >= 0 ? '+' : ''}{collection.floor_price_24h_change.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-4 px-4">
                    <div className="flex items-center justify-end space-x-1">
                      <Users className="h-3 w-3 text-purple-400" />
                      <span className="text-white">{collection.num_owners}</span>
                    </div>
                  </td>
                  <td className="text-right py-4 px-4">
                    <div className="flex items-center justify-end space-x-1">
                      <Package className="h-3 w-3 text-gray-400" />
                      <span className="text-white">{collection.total_supply}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-gray-400 text-sm">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCollections)} of {totalCollections} collections
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="text-sm"
            >
              Previous
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  onClick={() => onPageChange(page)}
                  className="w-10 h-10 text-sm"
                >
                  {page}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// ANALYTICS COMPONENTS
// ============================================

const AnalyticsSection = ({ collections }) => {
  // Prepare chart data from collections
  const volumeData = collections.slice(0, 5).map(collection => ({
    name: collection.name,
    volume: collection.volume_24h,
    floorPrice: collection.floor_price
  }));

  const priceChangeData = collections.slice(0, 8).map(collection => ({
    name: collection.name.substring(0, 12) + '...',
    change: collection.floor_price_24h_change
  }));

  const categoryData = Object.entries(
    collections.reduce((acc, collection) => {
      acc[collection.category] = (acc[collection.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Top Collections by Volume */}
      <Card className="lg:col-span-2 xl:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <BarChart3 className="h-5 w-5 text-cyan-400 mr-2" />
            Top Collections by 24h Volume
          </h3>
          <Badge variant="outline">Real-time</Badge>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#9CA3AF" />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#9CA3AF"
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                formatter={(value, name) => {
                  if (name === 'volume') return [value.toFixed(4) + ' BTC', '24h Volume'];
                  if (name === 'floorPrice') return [value.toFixed(4) + ' BTC', 'Floor Price'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="volume" fill="#06b6d4" radius={[0, 4, 4, 0]} name="24h Volume" />
              <Bar dataKey="floorPrice" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Floor Price" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Price Performance */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
          <LineChart className="h-5 w-5 text-cyan-400 mr-2" />
          Price Performance (24h)
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priceChangeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                formatter={(value) => [value.toFixed(1) + '%', '24h Change']}
              />
              <Bar dataKey="change" fill="#8884d8">
                {priceChangeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.change >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Collection Categories */}
      <Card className="lg:col-span-2 xl:col-span-1">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
          <PieChart className="h-5 w-5 text-cyan-400 mr-2" />
          Collection Categories
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState('24h');
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('volume_24h');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Use the store - REMOVE THE DUPLICATE STATE DECLARATIONS BELOW
  const {
    featuredCollections,
    latestCollections,
    topCollections,
    leaderboardLoading,
    leaderboardError,
    fetchLeaderboardData,
    clearLeaderboardCaches
  } = useCollectionStore();

  const itemsPerPage = 20;

  // Load data using the store
  const loadData = async () => {
    try {
      await fetchLeaderboardData(activeTab, { limit, timeframe });
    } catch (err) {
      console.error('Error loading collections:', err);
      // Error is already set in the store
    }
  };

  // Load data when tab or filters change
  useEffect(() => {
    loadData();
  }, [activeTab, timeframe, limit]);

  // Data ingestion example function
  const ingestCollectionData = async (collectionData) => {
    try {
      const result = await useCollectionStore.getState().ingestCollectionData(collectionData);
      console.log('Data ingested successfully:', result);
      
      // Refresh the current view
      loadData();
      
      return result;
    } catch (error) {
      console.error('Failed to ingest data:', error);
      throw error;
    }
  };

  // Update market data example
  const updateMarketData = async (slug, marketData) => {
    try {
      const result = await useCollectionStore.getState().updateCollectionMarketData(slug, marketData);
      console.log('Market data updated:', result);
      return result;
    } catch (error) {
      console.error('Failed to update market data:', error);
      throw error;
    }
  };

  // Example of data ingestion format
  const exampleDataIngestion = {
    slug: 'bitcoin-frogs',
    name: 'Bitcoin Frogs',
    description: 'Unique frog inscriptions on Bitcoin',
    image_url: 'https://example.com/frogs.png',
    inscriptions: [
      {
        id: 'abc123...',
        meta: new Map([['trait', 'green'], ['rarity', 'rare']])
      }
    ],
    marketData: {
      floor_price: 0.05,
      floor_price_24h_change: 12.5,
      volume_24h: 2.5,
      sales_24h: 25,
      num_owners: 1500,
      total_supply: 10000,
      percent_listed: 15.2
    },
    category: 'pfp',
    rarity: 'uncommon'
  };

  // Handle refresh
  const handleRefresh = () => {
    clearLeaderboardCaches();
    loadData();
  };

  // Handle sort
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Tabs configuration
  const tabs = [
    { value: 'featured', label: 'Featured', icon: Crown },
    { value: 'latest', label: 'Latest', icon: Zap },
    { value: 'all', label: 'All Collections', icon: Users }
  ];

  // Timeframe filters
  const timeframes = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' }
  ];

  // Limit options
  const limitOptions = [20, 30, 40, 50];

  // Use the loading state from the store
  if (leaderboardLoading && activeTab === 'featured') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"
          />
          <p className="text-cyan-300 text-lg">Loading collections...</p>
        </div>
      </div>
    );
  }

  // Use the error state from the store
  if (leaderboardError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/20 border border-red-400/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Data</h2>
          <p className="text-gray-300 mb-6">{leaderboardError}</p>
          <Button onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4 sm:px-6 lg:px-8"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Trophy className="h-8 w-8 text-cyan-400 mr-3" />
                TradingPulse Leaderboard
              </h1>
              <p className="text-gray-400 text-lg">
                Top Ordinals collections by volume, floor price, and market activity
              </p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 lg:mt-0">
              <div className="relative flex-1 lg:flex-none lg:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                />
              </div>
            </div>
          </div>

          {/* Timeframe and Limit Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
            <div className="flex items-center space-x-2">
              {timeframes.map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? 'default' : 'outline'}
                  onClick={() => setTimeframe(tf.value)}
                  className="text-sm"
                >
                  {tf.label}
                </Button>
              ))}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Show:</span>
              {limitOptions.map((option) => (
                <Button
                  key={option}
                  variant={limit === option ? 'default' : 'outline'}
                  onClick={() => setLimit(option)}
                  className="text-sm w-12"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            tabs={tabs}
            className="mb-8"
          />
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'featured' && (
              <FeaturedTab collections={featuredCollections} />
            )}

            {activeTab === 'latest' && (
              <LatestTab collections={latestCollections} />
            )}

            {activeTab === 'all' && (
              <AllTab
                collections={topCollections}
                totalCollections={topCollections.length}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Analytics Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <BarChart3 className="h-6 w-6 text-cyan-400 mr-2" />
            Market Analytics
          </h2>
          
          <AnalyticsSection collections={topCollections} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Leaderboard;