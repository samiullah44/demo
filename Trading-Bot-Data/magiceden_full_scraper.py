import time
import json
import csv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import re
from datetime import datetime

class PreciseMagicEdenScraper:
    def __init__(self):
        self.base_url = "https://magiceden.io/ordinals/marketplace/sub-10k"
        self.driver = None
        
    def setup_driver(self):
        """Setup Chrome driver"""
        chrome_options = Options()
        # Remove headless for debugging, but you can add it back later
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--start-maximized')
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.set_page_load_timeout(30)
        
    def extract_precise_nft_data(self):
        """Extract basic NFT data from the main listing page"""
        print("🎯 Extracting basic NFT data from listing...")
        
        try:
            all_data = self.driver.execute_script("""
                function extractPreciseNFTData() {
                    const results = [];
                    const nftCards = document.querySelectorAll('a[href*="/ordinals/item/"]');
                    
                    console.log(`Found ${nftCards.length} NFT cards`);
                    
                    nftCards.forEach((card, index) => {
                        try {
                            const nft = {
                                index: index,
                                name: 'Unknown',
                                inscription_id: 'Unknown',
                                inscription_number: 'Unknown',
                                price: 'Unknown',
                                owner: 'Unknown',
                                content_type: 'Unknown',
                                image_url: 'Unknown',
                                location: 'Unknown',
                                output: 'Unknown',
                                rarity: 'Unknown',
                                detail_url: card.href
                            };
                            
                            // Extract from image
                            const img = card.querySelector('img');
                            if (img && img.src) {
                                nft.image_url = img.src;
                                
                                // Extract inscription ID from image URL
                                const urlMatch = img.src.match(/([a-f0-9]{64}i\\d+)/);
                                if (urlMatch) {
                                    nft.inscription_id = urlMatch[1];
                                }
                            }
                            
                            // Extract all text content
                            const cardText = card.innerText;
                            const lines = cardText.split('\\n').map(l => l.trim()).filter(l => l);
                            
                            // Extract price
                            for (const line of lines) {
                                if (/\\d+\\.\\d+\\s*BTC/i.test(line)) {
                                    const priceMatch = line.match(/(\\d+\\.\\d+)\\s*BTC/i);
                                    if (priceMatch) {
                                        nft.price = priceMatch[1] + ' BTC';
                                    }
                                }
                                else if (/^\\d+\\.\\d+$/.test(line)) {
                                    const num = parseFloat(line);
                                    if (num > 0.001 && num < 50) {
                                        nft.price = line + ' BTC';
                                    }
                                }
                            }
                            
                            // Extract name and inscription number
                            for (let i = 0; i < lines.length; i++) {
                                const line = lines[i];
                                
                                if (line.includes('#') && /#\\d+/.test(line)) {
                                    const numberMatch = line.match(/#(\\d+)/);
                                    if (numberMatch) {
                                        nft.inscription_number = '#' + numberMatch[1];
                                        
                                        if (i > 0) {
                                            const prevLine = lines[i-1];
                                            if (!/^\\d+\\.\\d+$/.test(prevLine) && 
                                                !prevLine.includes('BTC') && 
                                                !prevLine.includes('Last') &&
                                                prevLine.length > 1 &&
                                                prevLine.length < 50) {
                                                nft.name = prevLine;
                                            }
                                        }
                                    }
                                }
                                
                                if (!line.includes('#') && 
                                    !/^\\d+\\.\\d+$/.test(line) && 
                                    !line.includes('BTC') && 
                                    !line.includes('Last') &&
                                    line.length > 2 && 
                                    line.length < 30 &&
                                    nft.name === 'Unknown') {
                                    nft.name = line;
                                }
                            }
                            
                            results.push(nft);
                            
                        } catch (error) {
                            console.error(`Error processing NFT ${index}:`, error);
                            results.push({
                                index: index,
                                name: `Error_${index}`,
                                inscription_id: 'Error',
                                inscription_number: 'Error',
                                price: 'Error',
                                owner: 'Error',
                                content_type: 'Error',
                                image_url: 'Error',
                                location: 'Error',
                                output: 'Error',
                                rarity: 'Error',
                                detail_url: 'Error'
                            });
                        }
                    });
                    
                    return results;
                }
                
                return extractPreciseNFTData();
            """)
            
            print(f"✅ Extracted {len(all_data)} NFTs from listing")
            return all_data
            
        except Exception as e:
            print(f"❌ JavaScript extraction failed: {e}")
            return []

    def extract_detailed_nft_info(self, detail_url):
        """Click on NFT and extract detailed information from individual page"""
        print(f"🔍 Extracting detailed info from: {detail_url}")
        
        try:
            # Navigate to the detail page
            self.driver.get(detail_url)
            
            # Wait for the detail page to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            time.sleep(2)  # Additional wait for dynamic content
            
            # Extract detailed information using JavaScript
            detailed_info = self.driver.execute_script("""
                function extractDetailedInfo() {
                    const details = {
                        owner: 'Unknown',
                        content_type: 'Unknown',
                        location: 'Unknown',
                        output: 'Unknown',
                        rarity: 'Unknown'
                    };
                    
                    try {
                        // Get all text content from the page
                        const pageText = document.body.innerText;
                        
                        // Look for owner/creator information
                        const ownerSelectors = [
                            '[class*="owner"]', 
                            '[class*="creator"]',
                            '[class*="address"]',
                            'text:contains("Owner")',
                            'text:contains("Creator")'
                        ];
                        
                        // Look for content type
                        if (pageText.includes('Content Type') || pageText.includes('content type')) {
                            const typeMatch = pageText.match(/(Content Type|content type):?\\s*([^\\n\\r]+)/i);
                            if (typeMatch) {
                                details.content_type = typeMatch[2].trim();
                            }
                        }
                        
                        // Look for location (Bitcoin address or transaction)
                        const btcAddressMatch = pageText.match(/([13][a-km-zA-HJ-NP-Z1-9]{25,34})/);
                        if (btcAddressMatch) {
                            details.location = btcAddressMatch[1];
                        }
                        
                        // Look for output/transaction
                        const outputMatch = pageText.match(/(output|tx|transaction):?\\s*([a-f0-9]{64})/i);
                        if (outputMatch) {
                            details.output = outputMatch[2];
                        }
                        
                        // Look for rarity
                        const rarityMatch = pageText.match(/(Common|Uncommon|Rare|Epic|Legendary|Mythic)/i);
                        if (rarityMatch) {
                            details.rarity = rarityMatch[1];
                        }
                        
                        // Try to find owner in specific sections
                        const ownerElements = document.querySelectorAll('[class*="owner"], [class*="Owner"]');
                        for (const el of ownerElements) {
                            const text = el.innerText.trim();
                            if (text && text.length > 0 && !text.includes('Unknown')) {
                                // Shorten long addresses
                                if (text.length > 15) {
                                    details.owner = text.substring(0, 8) + '...' + text.substring(text.length - 4);
                                } else {
                                    details.owner = text;
                                }
                                break;
                            }
                        }
                        
                        // Alternative: Look for owner in text patterns
                        if (details.owner === 'Unknown') {
                            const ownerTextMatch = pageText.match(/(Owner|owner):?\\s*([^\\n\\r]+)/i);
                            if (ownerTextMatch) {
                                const ownerText = ownerTextMatch[2].trim();
                                if (ownerText.length > 15) {
                                    details.owner = ownerText.substring(0, 8) + '...' + ownerText.substring(ownerText.length - 4);
                                } else {
                                    details.owner = ownerText;
                                }
                            }
                        }
                        
                        // Look for content type in specific elements
                        if (details.content_type === 'Unknown') {
                            const contentTypeElements = document.querySelectorAll('[class*="type"], [class*="content"]');
                            for (const el of contentTypeElements) {
                                const text = el.innerText.trim().toLowerCase();
                                if (text.includes('image/') || text.includes('text/') || text.includes('video/')) {
                                    details.content_type = text;
                                    break;
                                }
                            }
                        }
                        
                    } catch (error) {
                        console.error('Error extracting detailed info:', error);
                    }
                    
                    return details;
                }
                
                return extractDetailedInfo();
            """)
            
            return detailed_info
            
        except Exception as e:
            print(f"❌ Failed to extract detailed info: {e}")
            return {
                'owner': 'Unknown',
                'content_type': 'Unknown', 
                'location': 'Unknown',
                'output': 'Unknown',
                'rarity': 'Unknown'
            }

    def scrape_with_precision(self, max_nfts=10):
        """Main scraping method with detailed page navigation"""
        print("🚀 Starting detailed NFT data extraction...")
        start_time = time.time()
        
        self.setup_driver()
        
        try:
            # Load main page
            print("1. Loading main marketplace page...")
            self.driver.get(self.base_url)
            
            # Wait for content
            print("2. Waiting for NFT cards to load...")
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/ordinals/item/']"))
            )
            time.sleep(3)
            
            # Extract basic data from listing
            print("3. Extracting basic NFT data...")
            nft_data = self.extract_precise_nft_data()
            
            if not nft_data:
                print("❌ No NFT data found")
                return []
            
            # Limit the number of NFTs to process for testing
            nft_data = nft_data[:max_nfts]
            print(f"🔄 Processing first {len(nft_data)} NFTs for detailed information...")
            
            # Process each NFT for detailed information
            enhanced_data = []
            for i, nft in enumerate(nft_data):
                print(f"📦 Processing NFT {i+1}/{len(nft_data)}: {nft.get('name', 'Unknown')}")
                
                if nft['detail_url'] not in ['Unknown', 'Error']:
                    try:
                        # Extract detailed information from individual page
                        detailed_info = self.extract_detailed_nft_info(nft['detail_url'])
                        
                        # Merge basic and detailed information
                        nft.update(detailed_info)
                        
                        print(f"   ✅ Got details - Owner: {detailed_info['owner']}, Rarity: {detailed_info['rarity']}")
                        
                    except Exception as e:
                        print(f"   ❌ Failed to get details: {e}")
                        # Keep the basic data even if detailed extraction fails
                
                # Add timestamp
                nft['scraped_at'] = datetime.now().isoformat()
                enhanced_data.append(nft)
                
                # Small delay to avoid rate limiting
                time.sleep(1)
                
                # Navigate back to main page for next NFT (except for the last one)
                if i < len(nft_data) - 1:
                    print("   🔄 Returning to main page...")
                    self.driver.get(self.base_url)
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/ordinals/item/']"))
                    )
                    time.sleep(1)
            
            elapsed_time = time.time() - start_time
            
            # Calculate statistics
            self.calculate_statistics(enhanced_data, elapsed_time)
            
            return enhanced_data
            
        except Exception as e:
            print(f"❌ Detailed scraping failed: {e}")
            return []
        finally:
            if self.driver:
                self.driver.quit()

    def calculate_statistics(self, data, elapsed_time):
        """Calculate and display scraping statistics"""
        if not data:
            return
            
        valid_inscription_ids = len([n for n in data if n['inscription_id'] not in ['Unknown', 'Error']])
        valid_inscription_numbers = len([n for n in data if n['inscription_number'] not in ['Unknown', 'Error']])
        valid_names = len([n for n in data if n['name'] not in ['Unknown', 'Error']])
        valid_prices = len([n for n in data if n['price'] not in ['Unknown', 'Error']])
        valid_locations = len([n for n in data if n['location'] not in ['Unknown', 'Error']])
        valid_outputs = len([n for n in data if n['output'] not in ['Unknown', 'Error']])
        valid_rarities = len([n for n in data if n['rarity'] not in ['Unknown', 'Error']])
        valid_owners = len([n for n in data if n['owner'] not in ['Unknown', 'Error']])
        valid_content_types = len([n for n in data if n['content_type'] not in ['Unknown', 'Error']])
        
        print(f"\n🎯 DETAILED SCRAPING COMPLETED!")
        print(f"⏱️  Time: {elapsed_time:.2f} seconds")
        print(f"📊 Total NFTs Processed: {len(data)}")
        print(f"🔑 Inscription IDs: {valid_inscription_ids}")
        print(f"🔢 Inscription Numbers: {valid_inscription_numbers}")
        print(f"🏷️  Names: {valid_names}")
        print(f"💰 Prices: {valid_prices}")
        print(f"📍 Locations: {valid_locations}")
        print(f"📤 Outputs: {valid_outputs}")
        print(f"⭐ Rarities: {valid_rarities}")
        print(f"👤 Owners: {valid_owners}")
        print(f"📄 Content Types: {valid_content_types}")

    def save_precise_results(self, data, json_filename="detailed_nft_data.json", csv_filename="detailed_nft_data.csv"):
        """Save detailed results with all fields"""
        if not data:
            print("No data to save")
            return
        
        # Save to JSON
        try:
            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"💾 JSON data saved to {json_filename}")
        except Exception as e:
            print(f"❌ Failed to save JSON: {e}")
        
        # Save to CSV
        try:
            fieldnames = [
                'index', 'name', 'inscription_id', 'inscription_number', 
                'price', 'owner', 'content_type', 'image_url', 
                'location', 'output', 'rarity', 'detail_url', 'scraped_at'
            ]
            
            with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for nft in data:
                    row = {field: nft.get(field, '') for field in fieldnames}
                    writer.writerow(row)
            
            print(f"📊 CSV data saved to {csv_filename}")
        except Exception as e:
            print(f"❌ Failed to save CSV: {e}")

    def display_precise_summary(self, data):
        """Display detailed summary with all fields"""
        if not data:
            print("No data to display")
            return
        
        valid_data = [n for n in data if n['inscription_id'] not in ['Unknown', 'Error']]
        
        print(f"\n🎯 DETAILED DATA SUMMARY")
        print("=" * 120)
        print(f"Total NFTs: {len(data)}")
        print(f"Valid Inscription IDs: {len(valid_data)}")
        print(f"Success Rate: {(len(valid_data)/len(data))*100:.1f}%")
        
        print(f"\n📋 SAMPLE OF DETAILED DATA (First 5):")
        print("=" * 120)
        
        for i, nft in enumerate(valid_data[:5]):
            print(f"\nNFT {i+1}:")
            print(f"  Name: {nft.get('name', 'N/A')}")
            print(f"  Inscription ID: {nft.get('inscription_id', 'N/A')}")
            print(f"  Inscription Number: {nft.get('inscription_number', 'N/A')}")
            print(f"  Price: {nft.get('price', 'N/A')}")
            print(f"  Owner: {nft.get('owner', 'N/A')}")
            print(f"  Content Type: {nft.get('content_type', 'N/A')}")
            print(f"  Location: {nft.get('location', 'N/A')}")
            print(f"  Output: {nft.get('output', 'N/A')}")
            print(f"  Rarity: {nft.get('rarity', 'N/A')}")
            print(f"  Detail URL: {nft.get('detail_url', 'N/A')[:80]}...")
            print(f"  Image: {nft.get('image_url', 'N/A')[:80]}...")

# Main execution
if __name__ == "__main__":
    print("=== DETAILED MAGIC EDEN SCRAPER ===")
    print("Target: Extract all NFT fields by visiting individual detail pages")
    print("=" * 70)
    
    # Run detailed scraper
    scraper = PreciseMagicEdenScraper()
    
    print("🚀 Starting detailed data extraction...")
    
    # You can adjust max_nfts to control how many NFTs to process
    detailed_data = scraper.scrape_with_precision(max_nfts=5)  # Start with 5 for testing
    
    if detailed_data:
        # Save results
        scraper.save_precise_results(detailed_data)
        
        # Display summary
        scraper.display_precise_summary(detailed_data)
        
        valid_count = len([n for n in detailed_data if n['inscription_id'] not in ['Unknown', 'Error']])
        owner_count = len([n for n in detailed_data if n['owner'] not in ['Unknown', 'Error']])
        location_count = len([n for n in detailed_data if n['location'] not in ['Unknown', 'Error']])
        output_count = len([n for n in detailed_data if n['output'] not in ['Unknown', 'Error']])
        rarity_count = len([n for n in detailed_data if n['rarity'] not in ['Unknown', 'Error']])
        content_type_count = len([n for n in detailed_data if n['content_type'] not in ['Unknown', 'Error']])
        
        print(f"\n✅ SUCCESS! Detailed scraping completed!")
        print(f"📊 Total NFTs Processed: {len(detailed_data)}")
        print(f"🔑 Valid inscription IDs: {valid_count}")
        print(f"👤 Owners found: {owner_count}")
        print(f"📍 Locations found: {location_count}")
        print(f"📤 Outputs found: {output_count}")
        print(f"⭐ Rarities found: {rarity_count}")
        print(f"📄 Content types found: {content_type_count}")
        print("💾 Data saved to JSON and CSV formats")
        
    else:
        print("❌ No data was scraped.")