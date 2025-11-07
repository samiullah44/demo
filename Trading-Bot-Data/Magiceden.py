import time
import csv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import re
from datetime import datetime

class CompleteMagicEdenScraper:
    def __init__(self):
        self.base_url = "https://magiceden.io/ordinals/marketplace/sub-10k"
        self.driver = None
        self.scraped_inscriptions = set()  # Track already scraped inscriptions
        
    def setup_driver(self):
        """Setup Chrome driver with optimal settings for Magic Eden - HEADLESS"""
        chrome_options = Options()
        
        # Enable headless mode
        chrome_options.add_argument('--headless=new')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-images')  # Speed up loading
        chrome_options.add_argument('--blink-settings=imagesEnabled=false')  # Disable images
        
        # Set user agent and window size
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        chrome_options.add_argument('--window-size=1920,1080')
        
        # Additional performance optimizations
        chrome_options.add_argument('--disable-javascript')  # Caution: may break some sites
        chrome_options.add_experimental_option("excludeSwitches", ["enable-logging"])
        chrome_options.add_experimental_option('prefs', {
            'profile.default_content_setting_values': {
                'images': 2,  # Disable images
                'javascript': 1,  # Keep JavaScript enabled for dynamic content
            }
        })
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.set_page_load_timeout(45)  # Increase timeout for headless
        self.driver.implicitly_wait(10)

    def scroll_to_load_more(self, scroll_pause_time=3):
        """Scroll down to load more ordinals"""
        print("📜 Scrolling to load more ordinals...")
        
        # Get scroll height
        last_height = self.driver.execute_script("return document.body.scrollHeight")
        
        scroll_attempts = 0
        max_scroll_attempts = 15  # Prevent infinite scrolling
        
        while scroll_attempts < max_scroll_attempts:
            # Scroll down to bottom
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            
            # Wait to load page
            time.sleep(scroll_pause_time)
            
            # Calculate new scroll height and compare with last scroll height
            new_height = self.driver.execute_script("return document.body.scrollHeight")
            
            if new_height == last_height:
                scroll_attempts += 1
                print(f"  No new content loaded, attempt {scroll_attempts}/{max_scroll_attempts}")
                if scroll_attempts >= 3:  # Stop after 3 failed attempts
                    break
            else:
                scroll_attempts = 0
                last_height = new_height
                print(f"  New content loaded, scroll height: {new_height}")

    def get_all_ordinal_elements(self):
        """Get all ordinal elements currently in DOM"""
        try:
            # Try multiple selectors for ordinal cards
            selectors = [
                "a[href*='/ordinals/item-details/']",
                "div[class*='CardContainer']",
                "div[class*='card']",
                "div[class*='CollectionCard']",
                "[data-testid*='card']",
                ".card",
                ".collection-card"
            ]
            
            for selector in selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements and len(elements) > 5:  # Ensure we found meaningful number
                        print(f"✅ Found {len(elements)} ordinals using selector: {selector}")
                        return elements
                except:
                    continue
            
            # Fallback: look for any elements that might contain ordinals
            all_links = self.driver.find_elements(By.TAG_NAME, "a")
            ordinal_links = []
            for link in all_links:
                try:
                    href = link.get_attribute('href')
                    if href and '/ordinals/item-details/' in href:
                        ordinal_links.append(link)
                except:
                    continue
                    
            if ordinal_links:
                print(f"✅ Found {len(ordinal_links)} ordinals via href filtering")
                return ordinal_links
                
            print("❌ No ordinal elements found")
            return []
            
        except Exception as e:
            print(f"❌ Error finding ordinal elements: {e}")
            return []

    def extract_basic_info(self, element):
        """Extract basic info from ordinal element without clicking"""
        try:
            basic_info = {}
            
            # Get inscription ID from various sources
            inscription_id = None
            
            # Try to get from href
            try:
                href = element.get_attribute('href')
                if href and '/ordinals/item-details/' in href:
                    id_match = re.search(r'/ordinals/item-details/([a-f0-9]+i\d+)', href)
                    if id_match:
                        inscription_id = id_match.group(1)
            except:
                pass
            
            # Try to get from data attributes or other attributes
            if not inscription_id:
                try:
                    data_id = element.get_attribute('data-id') or element.get_attribute('data-inscription-id')
                    if data_id:
                        inscription_id = data_id
                except:
                    pass
            
            # Try to get from image src
            if not inscription_id:
                try:
                    img = element.find_element(By.TAG_NAME, 'img')
                    img_src = img.get_attribute('src')
                    if img_src:
                        # Extract from various URL patterns
                        patterns = [
                            r'/content/([a-f0-9]+i\d+)',
                            r'renderer.*[?&]id=([a-f0-9]+i\d+)',
                            r'content%2F([a-f0-9]+i\d+)'
                        ]
                        for pattern in patterns:
                            match = re.search(pattern, img_src)
                            if match:
                                inscription_id = match.group(1)
                                break
                except:
                    pass
            
            if inscription_id:
                basic_info['inscription_id'] = inscription_id
            else:
                return None  # Skip if no inscription ID found
                
            # Skip if already scraped
            if inscription_id in self.scraped_inscriptions:
                return None
                
            # Extract name
            try:
                name_elements = element.find_elements(By.CSS_SELECTOR, "[class*='name'], [class*='Name'], h1, h2, h3, h4, strong, b")
                for name_el in name_elements:
                    try:
                        name_text = name_el.text.strip()
                        if name_text and len(name_text) < 100 and name_text not in ['', 'Sub 10k']:
                            basic_info['name'] = name_text
                            break
                    except:
                        continue
            except:
                pass
                
            # Extract price
            try:
                price_text = element.text
                price_match = re.search(r'(\d+\.?\d*)\s*BTC', price_text)
                if price_match:
                    basic_info['price_btc'] = float(price_match.group(1))
            except:
                pass
                
            return basic_info
            
        except Exception as e:
            print(f"❌ Error extracting basic info: {e}")
            return None

    def extract_detailed_info(self, element):
        """Click on ordinal and extract detailed information from modal"""
        detailed_info = {}
        
        try:
            # Scroll element into view and click
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center', behavior: 'instant'});", element)
            time.sleep(1)
            
            # Click on the element using JavaScript (more reliable in headless)
            self.driver.execute_script("arguments[0].click();", element)
            time.sleep(4)  # Wait for modal to open
            
            # Wait for modal to appear with longer timeout for headless
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog'], .modal, [class*='modal'], [class*='overlay']"))
                )
            except TimeoutException:
                print("  ⚠️ Modal didn't open, skipping...")
                self.close_modal()
                return {}
            
            print("  📋 Extracting detailed information from modal...")
            
            # Extract all the detailed fields
            detailed_info.update(self.extract_image_info())
            detailed_info.update(self.extract_content_info())
            detailed_info.update(self.extract_owner_info())
            detailed_info.update(self.extract_inscription_details())
            detailed_info.update(self.extract_rarity_info())
            
            # Close the modal
            self.close_modal()
            
            return detailed_info
            
        except Exception as e:
            print(f"❌ Error extracting detailed info: {e}")
            # Try to close modal if open
            try:
                self.close_modal()
            except:
                pass
            return {}

    def extract_image_info(self):
        """Extract image URL and content type"""
        info = {}
        try:
            # Find image element in modal
            img_selectors = [
                "img[src*='content']",
                "img[src*='renderer']",
                ".modal img",
                "[role='dialog'] img",
                "img[class*='image']",
                "img[class*='preview']"
            ]
            
            for selector in img_selectors:
                try:
                    img = WebDriverWait(self.driver, 5).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    src = img.get_attribute('src')
                    if src and ('content' in src or 'renderer' in src):
                        info['image_url'] = src
                        
                        # Determine content type from URL or attributes
                        if 'webp' in src.lower():
                            info['content_type'] = 'image/webp'
                        elif 'png' in src.lower():
                            info['content_type'] = 'image/png'
                        elif 'jpg' in src.lower() or 'jpeg' in src.lower():
                            info['content_type'] = 'image/jpeg'
                        elif 'gif' in src.lower():
                            info['content_type'] = 'image/gif'
                        elif 'svg' in src.lower():
                            info['content_type'] = 'image/svg+xml'
                        elif 'text' in src.lower() or 'plain' in src.lower():
                            info['content_type'] = 'text/plain'
                        elif 'json' in src.lower():
                            info['content_type'] = 'application/json'
                        elif 'html' in src.lower():
                            info['content_type'] = 'text/html'
                        else:
                            info['content_type'] = 'unknown'
                        break
                except:
                    continue
                    
        except Exception as e:
            print(f"  ⚠️ Could not extract image info: {e}")
            
        return info

    def extract_content_info(self):
        """Extract content-related information"""
        info = {}
        try:
            modal_element = WebDriverWait(self.driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog'], .modal, [class*='modal']"))
            )
            modal_text = modal_element.text
            
            # Look for content type in text
            content_patterns = [
                r'Content Type[:\s]*([^\n]+)',
                r'Type[:\s]*([^\n]+)',
                r'MIME Type[:\s]*([^\n]+)',
                r'Content-Type[:\s]*([^\n]+)'
            ]
            
            for pattern in content_patterns:
                match = re.search(pattern, modal_text, re.IGNORECASE)
                if match and not info.get('content_type'):
                    content_type = match.group(1).strip()
                    if content_type and content_type != 'unknown':
                        info['content_type'] = content_type
                        break
                        
        except Exception as e:
            print(f"  ⚠️ Could not extract content info: {e}")
            
        return info

    def extract_owner_info(self):
        """Extract owner and location information"""
        info = {}
        try:
            modal_element = WebDriverWait(self.driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog'], .modal, [class*='modal']"))
            )
            modal_text = modal_element.text
            
            # Look for owner
            owner_patterns = [
                r'Owner[:\s]*([^\n]+)',
                r'Owned by[:\s]*([^\n]+)',
                r'Holder[:\s]*([^\n]+)',
                r'Owner Address[:\s]*([^\n]+)'
            ]
            
            for pattern in owner_patterns:
                match = re.search(pattern, modal_text, re.IGNORECASE)
                if match:
                    owner = match.group(1).strip()
                    if len(owner) > 10 and (owner.startswith('bc1') or '...' in owner or len(owner) > 20):
                        info['owner'] = owner
                        break
                        
            # Look for location (output)
            location_patterns = [
                r'Output[:\s]*([^\n]+)',
                r'Location[:\s]*([^\n]+)',
                r'Address[:\s]*([^\n]+)',
                r'Inscription Location[:\s]*([^\n]+)'
            ]
            
            for pattern in location_patterns:
                match = re.search(pattern, modal_text, re.IGNORECASE)
                if match:
                    location = match.group(1).strip()
                    if location:
                        info['location'] = location
                        break
                        
        except Exception as e:
            print(f"  ⚠️ Could not extract owner info: {e}")
            
        return info

    def extract_inscription_details(self):
        """Extract inscription details like value, timestamp, genesis transaction"""
        info = {}
        try:
            modal_element = WebDriverWait(self.driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog'], .modal, [class*='modal']"))
            )
            modal_text = modal_element.text
            
            # Look for value
            value_match = re.search(r'Value[:\s]*([\d,\.]+)', modal_text, re.IGNORECASE)
            if value_match:
                try:
                    value = float(value_match.group(1).replace(',', ''))
                    info['value'] = value
                except:
                    pass
            
            # Look for timestamp
            time_patterns = [
                r'Timestamp[:\s]*([^\n]+)',
                r'Inscribed[:\s]*([^\n]+)',
                r'Date[:\s]*([^\n]+)',
                r'Inscription Date[:\s]*([^\n]+)'
            ]
            
            for pattern in time_patterns:
                match = re.search(pattern, modal_text, re.IGNORECASE)
                if match:
                    timestamp_str = match.group(1).strip()
                    # Try to parse various date formats
                    for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d-%m-%Y', '%B %d, %Y', '%Y-%m-%d %H:%M:%S']:
                        try:
                            timestamp = datetime.strptime(timestamp_str, fmt)
                            info['timestamp'] = timestamp.isoformat()
                            break
                        except:
                            continue
                    if 'timestamp' not in info:
                        info['timestamp'] = timestamp_str  # Store as string if can't parse
                    break
            
            # Look for genesis transaction
            tx_patterns = [
                r'Genesis Transaction[:\s]*([a-fA-F0-9]+)',
                r'Transaction ID[:\s]*([a-fA-F0-9]+)',
                r'TxID[:\s]*([a-fA-F0-9]+)',
                r'Genesis Tx[:\s]*([a-fA-F0-9]+)'
            ]
            
            for pattern in tx_patterns:
                match = re.search(pattern, modal_text, re.IGNORECASE)
                if match:
                    info['genesis_tx'] = match.group(1).strip()
                    break
                    
        except Exception as e:
            print(f"  ⚠️ Could not extract inscription details: {e}")
            
        return info

    def extract_rarity_info(self):
        """Extract SAT rarity information"""
        info = {}
        try:
            modal_element = WebDriverWait(self.driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog'], .modal, [class*='modal']"))
            )
            modal_text = modal_element.text
            
            rarity_patterns = [
                r'Rarity[:\s]*([^\n]+)',
                r'Sat Rarity[:\s]*([^\n]+)',
                r'Rarity Type[:\s]*([^\n]+)',
                r'Satellite Rarity[:\s]*([^\n]+)'
            ]
            
            for pattern in rarity_patterns:
                match = re.search(pattern, modal_text, re.IGNORECASE)
                if match:
                    rarity = match.group(1).strip().lower()
                    # Map to allowed values
                    if any(r in rarity for r in ['common', 'standard']):
                        info['Sat_Rarity'] = 'common'
                    elif 'uncommon' in rarity:
                        info['Sat_Rarity'] = 'uncommon'
                    elif 'rare' in rarity:
                        info['Sat_Rarity'] = 'rare'
                    elif 'epic' in rarity:
                        info['Sat_Rarity'] = 'epic'
                    elif 'legendary' in rarity:
                        info['Sat_Rarity'] = 'legendary'
                    elif 'mythic' in rarity:
                        info['Sat_Rarity'] = 'mythic'
                    else:
                        info['Sat_Rarity'] = 'N/A'
                    break
                    
            if 'Sat_Rarity' not in info:
                info['Sat_Rarity'] = 'N/A'
                
        except Exception as e:
            print(f"  ⚠️ Could not extract rarity info: {e}")
            info['Sat_Rarity'] = 'N/A'
            
        return info

    def close_modal(self):
        """Close the modal dialog"""
        try:
            # Try various close button selectors
            close_selectors = [
                "[aria-label='Close']",
                ".close",
                "[class*='close']",
                "button[class*='close']",
                "svg[class*='close']",
                "//button[contains(text(), 'Close')]",
                "//span[contains(text(), '×')]",
                "button[aria-label*='close']",
                ".modal-close",
                "[data-testid='close-button']"
            ]
            
            for selector in close_selectors:
                try:
                    if selector.startswith('//'):
                        close_btn = self.driver.find_element(By.XPATH, selector)
                    else:
                        close_btn = WebDriverWait(self.driver, 2).until(
                            EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                        )
                    self.driver.execute_script("arguments[0].click();", close_btn)
                    time.sleep(1)
                    return
                except:
                    continue
            
            # Fallback: press escape key
            from selenium.webdriver.common.keys import Keys
            self.driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
            time.sleep(1)
            
        except Exception as e:
            print(f"  ⚠️ Could not close modal: {e}")

    def scrape_all_ordinals(self, max_items=100):
        """Main method to scrape all ordinals with complete data - HEADLESS"""
        print("🚀 Starting complete ordinal data extraction (HEADLESS MODE)...")
        start_time = time.time()
        
        self.setup_driver()
        all_data = []
        
        try:
            # Load page
            print("1. Loading Magic Eden sub-10k page...")
            self.driver.get(self.base_url)
            
            # Wait for initial content
            print("2. Waiting for initial content to load...")
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            time.sleep(5)
            
            scroll_batch = 0
            max_scroll_batches = 8
            
            while len(all_data) < max_items and scroll_batch < max_scroll_batches:
                scroll_batch += 1
                print(f"\n📦 Processing scroll batch {scroll_batch}...")
                
                # Scroll to load more items
                self.scroll_to_load_more()
                
                # Get all ordinal elements
                ordinal_elements = self.get_all_ordinal_elements()
                print(f"  Found {len(ordinal_elements)} elements in DOM")
                
                if not ordinal_elements:
                    print("  No more ordinals found, stopping...")
                    break
                
                # Process each ordinal
                processed_in_batch = 0
                for i, element in enumerate(ordinal_elements):
                    if len(all_data) >= max_items:
                        break
                        
                    try:
                        print(f"  Processing ordinal {i+1}/{len(ordinal_elements)}...")
                        
                        # Extract basic info first
                        basic_info = self.extract_basic_info(element)
                        if not basic_info:
                            continue
                            
                        # Skip if already processed
                        if basic_info['inscription_id'] in self.scraped_inscriptions:
                            continue
                            
                        # Extract detailed info by clicking
                        detailed_info = self.extract_detailed_info(element)
                        
                        # Combine all data
                        complete_data = {
                            **basic_info,
                            **detailed_info,
                            'fetched_at': datetime.now().isoformat()
                        }
                        
                        # Ensure all required fields are present
                        for field in ['name', 'image_url', 'content_type', 'price_btc', 
                                    'owner', 'location', 'value', 'Sat_Rarity', 
                                    'timestamp', 'genesis_tx']:
                            if field not in complete_data:
                                complete_data[field] = None
                        
                        # Add to results
                        all_data.append(complete_data)
                        self.scraped_inscriptions.add(basic_info['inscription_id'])
                        processed_in_batch += 1
                        
                        print(f"    ✅ Successfully scraped: {basic_info.get('inscription_id', 'Unknown')}")
                        
                        # Smaller delay between items in headless mode
                        time.sleep(1)
                        
                    except Exception as e:
                        print(f"    ❌ Failed to process ordinal {i+1}: {e}")
                        continue
                
                print(f"  Processed {processed_in_batch} new ordinals in this batch")
                
                # If no new items were processed, stop
                if processed_in_batch == 0:
                    print("  No new ordinals processed in this batch, stopping...")
                    break
            
            elapsed_time = time.time() - start_time
            
            print(f"\n🎯 SCRAPING COMPLETED!")
            print(f"⏱️  Time: {elapsed_time:.2f} seconds")
            print(f"📊 Total Ordinals Scraped: {len(all_data)}")
            
            return all_data
            
        except Exception as e:
            print(f"❌ Scraping failed: {e}")
            return all_data
        finally:
            if self.driver:
                self.driver.quit()
                print("🔚 Browser closed.")

    def save_to_csv(self, data, filename="complete_magiceden_ordinals.csv"):
        """Save all data to CSV with all fields"""
        if not data:
            print("No data to save")
            return False
            
        try:
            fieldnames = ['inscription_id', 'name', 'image_url', 'content_type', 
                         'price_btc', 'owner', 'location', 'value', 'Sat_Rarity',
                         'timestamp', 'genesis_tx', 'fetched_at']
            
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for item in data:
                    row = {field: item.get(field, '') for field in fieldnames}
                    writer.writerow(row)
            
            print(f"💾 Data saved to {filename}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to save CSV: {e}")
            return False

    def display_summary(self, data):
        """Display summary of scraped data"""
        if not data:
            print("No data to display")
            return
        
        print(f"\n📊 COMPLETE DATA SUMMARY")
        print("=" * 120)
        print(f"Total Ordinals: {len(data)}")
        
        # Field completion statistics
        fields = ['name', 'image_url', 'content_type', 'price_btc', 'owner', 
                 'location', 'value', 'Sat_Rarity', 'timestamp', 'genesis_tx']
        
        for field in fields:
            filled = len([d for d in data if d.get(field) not in [None, '']])
            percentage = (filled / len(data)) * 100
            print(f"{field:<15}: {filled:>3}/{len(data)} ({percentage:>5.1f}%)")
        
        print(f"\n📋 SAMPLE DATA (First 5 ordinals):")
        print("=" * 120)
        for i, item in enumerate(data[:5]):
            print(f"Ordinal {i+1}:")
            for field in ['inscription_id', 'name', 'price_btc', 'content_type', 'Sat_Rarity']:
                value = item.get(field, 'N/A')
                if value is None:
                    value = 'N/A'
                print(f"  {field:<15}: {value}")
            print()

# Main execution
if __name__ == "__main__":
    print("=== COMPLETE MAGIC EDEN ORDINAL SCRAPER (HEADLESS) ===")
    print("Target: Extract all fields from sub-10k ordinals")
    print("Mode: Headless (No browser visible)")
    print("Fields: inscription_id, name, image_url, content_type, price_btc, owner, location, value, Sat_Rarity, timestamp, genesis_tx, fetched_at")
    print("=" * 80)
    
    # Run scraper
    scraper = CompleteMagicEdenScraper()
    
    print("🚀 Starting complete ordinal extraction in headless mode...")
    ordinal_data = scraper.scrape_all_ordinals(max_items=50)  # Adjust as needed
    
    if ordinal_data:
        # Save to CSV
        success = scraper.save_to_csv(ordinal_data, "magiceden_sub10k_headless.csv")
        
        # Display summary
        scraper.display_summary(ordinal_data)
        
        if success:
            print(f"\n✅ SUCCESS! Extracted {len(ordinal_data)} ordinals with complete data!")
            print("💾 Data saved to magiceden_sub10k_headless.csv")
            print("🔍 Check the CSV file for all scraped data.")
        else:
            print("❌ Failed to save data to CSV file.")
    else:
        print("❌ No data was scraped.")