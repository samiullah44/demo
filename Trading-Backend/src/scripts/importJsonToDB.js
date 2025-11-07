import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/database.js";
import Ordinal from "../models/Ordinal.js"; // adjust if model path differs

dotenv.config();

const __dirname = path.resolve();

const dataPath = path.resolve(__dirname, "Data/ordinals.json");

const importData = async () => {
  try {
    await connectDB();

    // Step 1: Read JSON file
    const rawData = fs.readFileSync(dataPath, "utf8");
    const ordinals = JSON.parse(rawData);

    console.log(`📦 Found ${ordinals.length} records to import.`);

    for (const item of ordinals) {
      // Convert BTC string price to number
      const priceValue = item.price
        ? parseFloat(item.price.replace(" BTC", "").trim())
        : null;

      // Check if it already exists
      const existing = await Ordinal.findOne({
        inscription_id: item.inscription_id,
      });

      if (existing) {
        console.log(`⏭️ Skipped (exists): ${item.inscription_id}`);
        continue;
      }

      // Prepare document
      const newOrdinal = {
        inscription_id: item.inscription_id,
        name: item.name || "N/A",
        image_url: item.image_url || "N/A",
        content_type: item.content_type || "N/A",
        price_btc: priceValue,
        owner: item.owner || "N/A",
        location: item.root || "N/A",
        value: null,
        Sat_Rarity: "N/A",
        timestamp: new Date(item.timestamp * 1000),
        genesis_tx: item.genesis_tx || "N/A",
        fetched_at: new Date(item.fetched_at),
        source: "scraper",
      };

      await Ordinal.create(newOrdinal);
      console.log(`✅ Inserted: ${item.inscription_id}`);
    }

    console.log("🎉 All data imported successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
};

importData();
