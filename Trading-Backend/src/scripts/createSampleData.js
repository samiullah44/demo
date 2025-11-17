// scripts/createEnhancedSampleData.js
import mongoose from 'mongoose';
import Collection from '../models/Collection.js';
import dotenv from 'dotenv';
dotenv.config();

const enhancedCollections = [
  {
    slug: 'bitcoin-frogs',
    name: 'Bitcoin Frogs',
    description: '10,000 unique frog inscriptions hopping on Bitcoin',
    image_url: 'https://bafybeifqwdzvuwj4vq4j5qumx5n4xop5g5q3wj5v4vq4vq4vq4vq4vq4vq',
    inscriptions: [
      { id: '6fb976ab49d772b77c2d63cd3b63c5015f7f66c11b5e9e0f6a6c5e4c5e4c5e4c5i0', meta: new Map([['background', 'green'], ['rarity', 'rare']]) },
      { id: '7ac987bc50e883c88d3d74de4c74de6126g8g77d26f0f0g7b7d6f5d6f5d6f5d6fi0', meta: new Map([['background', 'blue'], ['rarity', 'common']]) }
    ],
    floor_price: 0.045,
    floor_price_24h_change: 8.2,
    floor_price_7d_change: 15.7,
    floor_price_30d_change: 42.3,
    volume_24h: 3.2,
    volume_7d: 18.5,
    volume_30d: 85.2,
    total_volume: 320.5,
    sales_24h: 28,
    sales_7d: 156,
    sales_30d: 642,
    total_supply: 10000,
    num_owners: 2345,
    percent_listed: 12.8,
    category: 'pfp',
    rarity: 'uncommon',
    twitter_followers: 12500,
    discord_members: 8500,
    market_health_score: 78.5,
    featured_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Featured for 7 days
    source: 'manual'
  },
  {
    slug: 'ordinal-punks',
    name: 'Ordinal Punks',
    description: 'The original punks inscribed on Bitcoin',
    image_url: 'https://ipfs.io/ipfs/bafybeifqwdzvuwj4vq4j5qumx5n4xop5g5q3wj5v4vq4vq4vq4vq4vq4vq',
    inscriptions: [
      { id: '8bd098cd51f994d99e4e85ef5d85ef7237h9h88e37g1g1h8c8e7g6e7g6e7g6e7gi0', meta: new Map([['type', 'alien'], ['rarity', 'mythic']]) }
    ],
    floor_price: 0.125,
    floor_price_24h_change: -3.7,
    floor_price_7d_change: 5.2,
    floor_price_30d_change: 28.9,
    volume_24h: 2.1,
    volume_7d: 12.8,
    volume_30d: 58.7,
    total_volume: 285.3,
    sales_24h: 15,
    sales_7d: 98,
    sales_30d: 423,
    total_supply: 10000,
    num_owners: 1890,
    percent_listed: 9.5,
    category: 'pfp',
    rarity: 'rare',
    twitter_followers: 8900,
    discord_members: 5200,
    market_health_score: 72.3,
    source: 'manual'
  },
  {
    slug: 'bitcoin-shrooms',
    name: 'Bitcoin Shrooms',
    description: 'Psychedelic mushroom art on the Bitcoin blockchain',
    image_url: 'https://ipfs.io/ipfs/bafybeifqwdzvuwj4vq4j5qumx5n4xop5g5q3wj5v4vq4vq4vq4vq4vq4vq',
    inscriptions: [
      { id: '9ce1a9de62gaa5ea0f5f96f06f96f08348i0i99f48h2h2i9d9f8h7f8h7f8h7f8hi0', meta: new Map([['color', 'rainbow'], ['rarity', 'legendary']]) }
    ],
    floor_price: 0.082,
    floor_price_24h_change: 15.3,
    floor_price_7d_change: 32.8,
    floor_price_30d_change: 67.4,
    volume_24h: 4.5,
    volume_7d: 25.3,
    volume_30d: 112.8,
    total_volume: 198.7,
    sales_24h: 42,
    sales_7d: 234,
    sales_30d: 856,
    total_supply: 5000,
    num_owners: 1567,
    percent_listed: 18.2,
    category: 'art',
    rarity: 'epic',
    twitter_followers: 6700,
    discord_members: 3200,
    market_health_score: 85.1,
    featured_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Featured for 3 days
    source: 'manual'
  },
  {
    slug: 'bitcoin-birds',
    name: 'Bitcoin Birds',
    description: 'Colorful bird illustrations flying on Bitcoin',
    image_url: 'https://ipfs.io/ipfs/bafybeifqwdzvuwj4vq4j5qumx5n4xop5g5q3wj5v4vq4vq4vq4vq4vq4vq',
    inscriptions: [
      { id: '0df2bae73hbb6fb1g6g07g17g07g19459j1k0g59i3i3j0e0g9i8g9i8g9i8g9ij0', meta: new Map([['species', 'peacock'], ['rarity', 'epic']]) }
    ],
    floor_price: 0.028,
    floor_price_24h_change: 2.1,
    floor_price_7d_change: 8.7,
    floor_price_30d_change: 35.2,
    volume_24h: 1.2,
    volume_7d: 8.4,
    volume_30d: 42.6,
    total_volume: 156.3,
    sales_24h: 18,
    sales_7d: 112,
    sales_30d: 489,
    total_supply: 8000,
    num_owners: 1234,
    percent_listed: 11.3,
    category: 'art',
    rarity: 'uncommon',
    twitter_followers: 4500,
    discord_members: 2100,
    market_health_score: 65.8,
    source: 'manual'
  },
  {
    slug: 'ordinal-cats',
    name: 'Ordinal Cats',
    description: 'Feline friends permanently inscribed on Bitcoin',
    image_url: 'https://ipfs.io/ipfs/bafybeifqwdzvuwj4vq4j5qumx5n4xop5g5q3wj5v4vq4vq4vq4vq4vq4vq',
    inscriptions: [
      { id: '1eg3cbf84icc7gc2h7h18h28h18h2a50k2l1h60j4j4k1f1h0j9h0j9h0j9h0jk0', meta: new Map([['breed', 'siamese'], ['rarity', 'rare']]) }
    ],
    floor_price: 0.067,
    floor_price_24h_change: -1.5,
    floor_price_7d_change: 12.4,
    floor_price_30d_change: 48.9,
    volume_24h: 2.8,
    volume_7d: 16.2,
    volume_30d: 78.4,
    total_volume: 234.1,
    sales_24h: 24,
    sales_7d: 145,
    sales_30d: 612,
    total_supply: 7500,
    num_owners: 1789,
    percent_listed: 14.7,
    category: 'pfp',
    rarity: 'rare',
    twitter_followers: 7800,
    discord_members: 4300,
    market_health_score: 71.2,
    source: 'manual'
  }
];

async function createEnhancedSampleData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing sample data (optional)
    await Collection.deleteMany({ 
      slug: { $in: enhancedCollections.map(c => c.slug) },
      source: 'manual' 
    });

    // Insert new collections
    for (const collectionData of enhancedCollections) {
      const collection = new Collection(collectionData);
      await collection.save();
      
      // Add some price history for charts
      for (let i = 30; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
        await collection.addPriceHistory({
          timestamp: date,
          floor_price: collectionData.floor_price * randomFactor,
          volume: collectionData.volume_24h * (0.5 + Math.random()),
          sales: Math.floor(collectionData.sales_24h * (0.3 + Math.random() * 0.7))
        });
      }
      
      // Calculate market health
      await collection.calculateMarketHealth();
      
      console.log(`✅ Created: ${collection.slug} with ${collection.inscriptions.length} inscriptions`);
    }

    console.log('🎉 Enhanced sample data created successfully!');
    console.log('📊 You now have 5 collections with market data and price history');
    console.log('🚀 Your leaderboard should now work with real data!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating enhanced sample data:', error);
    process.exit(1);
  }
}

createEnhancedSampleData();