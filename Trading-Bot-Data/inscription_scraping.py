import time
import csv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
import re
from datetime import datetime

class CompleteMagicEdenScraper:
    def __init__(self):
        self.base_url = "https://magiceden.io/ordinals/marketplace/sub-10k"
        self.driver = None
        
    def setup_driver(self):
        """Setup Chrome driver"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        chrome_options.add_argument('--window-size=1920,1080')  # Set initial size
        
        chrome_options.add_argument('--start-maximized')
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.set_page_load_timeout(30)
        

    def extract_complete_data(self):
        """Extract complete NFT data with name, inscription ID, and price"""
        print("🎯 Extracting complete NFT data...")
        
        try:
            complete_data = self.driver.execute_script("""
                function extractCompleteNFTData() {
                    const results = [];
                    const nftCards = document.querySelectorAll('div[class*=\"pb-2\"]');
                    
                    console.log(`Found ${nftCards.length} NFT cards`);
                    
                    nftCards.forEach((card, index) => {
                        try {
                            const nft = {
                                index: index,
                                name: 'Unknown',
                                inscription_id: 'Unknown',
                                price: 'Unknown'
                            };
                            
                            // STRATEGY 1: Extract inscription ID from image URL
                            const img = card.querySelector('img');
                            if (img && img.src) {
                                // Extract inscription ID from image URL pattern
                                const urlMatch = img.src.match(/content\\/([a-f0-9]+i\\d+)/);
                                if (urlMatch) {
                                    nft.inscription_id = urlMatch[1];
                                }
                                
                                // Alternative pattern for renderer URLs
                                if (nft.inscription_id === 'Unknown' && img.src.includes('renderer.magiceden.dev')) {
                                    const rendererMatch = img.src.match(/[?&]id=([a-f0-9]+i\\d+)/);
                                    if (rendererMatch) {
                                        nft.inscription_id = rendererMatch[1];
                                    }
                                }
                            }
                            
                            // STRATEGY 2: Extract price information
                            const cardText = card.innerText;
                            const lines = cardText.split('\\n').map(l => l.trim()).filter(l => l);
                            
                            // Look for price patterns in the text
                            for (let i = 0; i < lines.length; i++) {
                                const line = lines[i];
                                
                                // Look for BTC price pattern (e.g., "0.0059 BTC")
                                if (line.includes('BTC') && /\\d+\\.\\d+/.test(line)) {
                                    const priceMatch = line.match(/(\\d+\\.\\d+)\\s*BTC/);
                                    if (priceMatch) {
                                        nft.price = priceMatch[1] + ' BTC';
                                        break;
                                    }
                                }
                                
                                // Look for standalone decimal numbers that could be prices
                                if (/^\\d+\\.\\d+$/.test(line)) {
                                    const priceValue = parseFloat(line);
                                    // Check if it's a reasonable price range for BTC (not an inscription number)
                                    if (priceValue > 0.001 && priceValue < 10) {
                                        // Check context - if next line is BTC, it's definitely a price
                                        if (i + 1 < lines.length && lines[i + 1] === 'BTC') {
                                            nft.price = line + ' BTC';
                                            break;
                                        } else {
                                            // Assume it's a price if it's in reasonable range
                                            nft.price = line + ' BTC';
                                        }
                                    }
                                }
                            }
                            
                            // STRATEGY 3: Advanced name extraction
                            let potentialNames = [];
                            
                            for (let i = 0; i < lines.length; i++) {
                                const line = lines[i];
                                
                                // Skip common non-name patterns
                                if (line.includes('+2') || 
                                    line.includes('10K') ||
                                    line.includes('BTC') ||
                                    line.includes('Last') ||
                                    line.includes('Buy Now') ||
                                    /^\\d+\\.\\d+$/.test(line) ||
                                    line.length < 2 ||
                                    line.length > 50) {
                                    continue;
                                }
                                
                                // Look for inscription number pattern and get the previous line as name
                                if (line.includes('#') && /#\\d+/.test(line)) {
                                    if (i > 0) {
                                        const prevLine = lines[i-1];
                                        // Check if previous line could be a valid name
                                        if (!prevLine.includes('+2') && 
                                            !prevLine.includes('10K') &&
                                            !prevLine.includes('BTC') &&
                                            !prevLine.includes('Last') &&
                                            !/^\\d+\\.\\d+$/.test(prevLine) &&
                                            prevLine.length > 1 &&
                                            prevLine.length < 30) {
                                            potentialNames.push(prevLine);
                                        }
                                    }
                                }
                                
                                // Look for standalone names (not near numbers or prices)
                                if (!line.includes('#') && 
                                    !/^\\d+$/.test(line) &&
                                    !line.includes('Inscription') &&
                                    line.length > 1 && 
                                    line.length < 25) {
                                    potentialNames.push(line);
                                }
                            }
                            
                            // Remove duplicates and select the best name
                            potentialNames = [...new Set(potentialNames)];
                            
                            if (potentialNames.length > 0) {
                                // Prefer names that don't contain common words
                                const filteredNames = potentialNames.filter(name => 
                                    !name.includes('Inscription') && 
                                    !name.includes('Last') &&
                                    !name.includes('BTC')
                                );
                                
                                if (filteredNames.length > 0) {
                                    nft.name = filteredNames[0];
                                } else {
                                    nft.name = potentialNames[0];
                                }
                            }
                            
                            // STRATEGY 4: If name is still unknown, look for text in specific elements
                            if (nft.name === 'Unknown') {
                                const nameElements = card.querySelectorAll('span, div');
                                for (const el of nameElements) {
                                    const text = el.textContent.trim();
                                    if (text && 
                                        !text.includes('+2') &&
                                        !text.includes('10K') &&
                                        !text.includes('BTC') &&
                                        !text.includes('Last') &&
                                        !text.includes('Buy Now') &&
                                        !/^\\d+\\.\\d+$/.test(text) &&
                                        text.length > 1 && 
                                        text.length < 25 &&
                                        !text.includes('Inscription')) {
                                        nft.name = text;
                                        break;
                                    }
                                }
                            }
                            
                            results.push(nft);
                            
                        } catch (error) {
                            console.error(`Error processing NFT ${index}:`, error);
                            results.push({
                                index: index,
                                name: `Error_${index}`,
                                inscription_id: 'Error',
                                price: 'Error'
                            });
                        }
                    });
                    
                    return results;
                }
                
                return extractCompleteNFTData();
            """)
            
            print(f"✅ Extracted complete data for {len(complete_data)} NFTs")
            return complete_data
            
        except Exception as e:
            print(f"❌ JavaScript extraction failed: {e}")
            return []

    def scrape_complete_data(self):
        """Main scraping method with complete data extraction"""
        print("🚀 Starting complete NFT data extraction...")
        start_time = time.time()
        
        self.setup_driver()
        
        try:
            # Load page
            print("1. Loading page...")
            self.driver.get(self.base_url)
            
            # Wait for content
            print("2. Waiting for content...")
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div[class*='pb-2']"))
            )
            time.sleep(3)  # Give more time for content to load
            
            # Extract data
            print("3. Extracting complete NFT data...")
            nft_data = self.extract_complete_data()
            
            # Add timestamp
            timestamp = datetime.now().isoformat()
            for nft in nft_data:
                nft['scraped_at'] = timestamp
            
            elapsed_time = time.time() - start_time
            
            # Calculate statistics
            valid_inscription_ids = len([n for n in nft_data if n['inscription_id'] not in ['Unknown', 'Error']])
            valid_names = len([n for n in nft_data if n['name'] not in ['Unknown', 'Error', '+2']])
            valid_prices = len([n for n in nft_data if n['price'] not in ['Unknown', 'Error']])
            
            print(f"\n🎯 COMPLETE SCRAPING COMPLETED!")
            print(f"⏱️  Time: {elapsed_time:.2f} seconds")
            print(f"📊 Total NFTs: {len(nft_data)}")
            print(f"🔑 Valid Inscription IDs: {valid_inscription_ids}")
            print(f"🏷️  Valid Names: {valid_names}")
            print(f"💰 Valid Prices: {valid_prices}")
            
            return nft_data
            
        except Exception as e:
            print(f"❌ Complete scraping failed: {e}")
            return []
        finally:
            if self.driver:
                self.driver.quit()

    def save_to_single_csv(self, data, filename="complete_magiceden_nfts.csv"):
        """Save data to a single CSV file only"""
        if not data:
            print("No data to save")
            return False
            
        try:
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['index', 'name', 'inscription_id', 'price', 'scraped_at'])
                writer.writeheader()
                
                for nft in data:
                    row = {
                        'index': nft.get('index', ''),
                        'name': nft.get('name', ''),
                        'inscription_id': nft.get('inscription_id', ''),
                        'price': nft.get('price', ''),
                        'scraped_at': nft.get('scraped_at', '')
                    }
                    writer.writerow(row)
            
            print(f"💾 Data saved to {filename}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to save CSV: {e}")
            return False

    def display_complete_summary(self, data):
        """Display complete summary"""
        if not data:
            print("No data to display")
            return
        
        valid_data = [n for n in data if n['inscription_id'] not in ['Unknown', 'Error']]
        good_names = [n for n in data if n['name'] not in ['Unknown', 'Error', '+2']]
        valid_prices = [n for n in data if n['price'] not in ['Unknown', 'Error']]
        
        print(f"\n🎯 COMPLETE DATA SUMMARY")
        print("=" * 100)
        print(f"Total NFTs: {len(data)}")
        print(f"Valid Inscription IDs: {len(valid_data)}")
        print(f"Good Names: {len(good_names)}")
        print(f"Valid Prices: {len(valid_prices)}")
        print(f"Success Rate: {(len(valid_data)/len(data))*100:.1f}%")
        
        # Price statistics
        prices = []
        for nft in valid_prices:
            if nft['price'] != 'Unknown' and 'BTC' in nft['price']:
                try:
                    price_value = float(nft['price'].split(' ')[0])
                    prices.append(price_value)
                except:
                    pass
        
        if prices:
            print(f"💰 Price Range: {min(prices):.6f} - {max(prices):.6f} BTC")
            print(f"💰 Average Price: {sum(prices)/len(prices):.6f} BTC")
        
        print(f"\n📋 SAMPLE DATA (First 10 NFTs):")
        print("=" * 100)
        print(f"{'Index':<6} {'Name':<20} {'Price':<15} {'Inscription ID':<20}")
        print("-" * 100)
        
        for nft in data[:10]:
            name_display = nft['name'][:18] + '..' if len(nft['name']) > 20 else nft['name']
            price_display = nft['price'][:13] if len(nft['price']) > 15 else nft['price']
            inscription_display = nft['inscription_id'][:18] + '..' if len(nft['inscription_id']) > 20 else nft['inscription_id']
            print(f"{nft['index']:<6} {name_display:<20} {price_display:<15} {inscription_display:<20}")

# Main execution
if __name__ == "__main__":
    print("=== COMPLETE MAGIC EDEN SCRAPER ===")
    print("Target: Extract index, name, inscription ID, and price")
    print("Output: Single CSV file")
    print("=" * 70)
    
    # Run complete scraper
    scraper = CompleteMagicEdenScraper()
    
    print("🚀 Starting complete data extraction...")
    nft_data = scraper.scrape_complete_data()
    
    if nft_data:
        # Save to single CSV file
        success = scraper.save_to_single_csv(nft_data, "scraped_data_nfts.csv")
        
        # Display summary
        scraper.display_complete_summary(nft_data)
        
        if success:
            valid_count = len([n for n in nft_data if n['inscription_id'] not in ['Unknown', 'Error']])
            good_names_count = len([n for n in nft_data if n['name'] not in ['Unknown', 'Error', '+2']])
            valid_prices_count = len([n for n in nft_data if n['price'] not in ['Unknown', 'Error']])
            
            print(f"\n✅ SUCCESS! Extracted {valid_count} NFTs with inscription IDs!")
            print(f"🏷️  Found {good_names_count} proper names!")
            print(f"💰 Found {valid_prices_count} prices!")
            print("💾 Data saved to complete_magiceden_nfts.csv")
        else:
            print("❌ Failed to save data to CSV file.")
    else:
        print("❌ No data was scraped.")