import time
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
import re
from datetime import datetime
import json
import sys


# ---------------- DRIVER SETUP ----------------
def setup_driver():
    """Setup Chrome driver with enhanced anti-detection options"""
    print("🔧 Setting up Chrome driver...")
    chrome_options = Options()

    # Anti-detection & performance tweaks
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-plugins")
    chrome_options.add_argument("--disable-images")
    chrome_options.add_argument("--blink-settings=imagesEnabled=false")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-background-timer-throttling")
    chrome_options.add_argument("--disable-backgrounding-occluded-windows")
    chrome_options.add_argument("--disable-renderer-backgrounding")
    chrome_options.add_experimental_option(
        "prefs", {"profile.default_content_setting_values.clipboard": 1}
    )

    # Random user agent
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ]
    chrome_options.add_argument(f"--user-agent={random.choice(user_agents)}")

    driver = webdriver.Chrome(options=chrome_options)
    driver.execute_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )
    return driver


def random_delay(a=1, b=3):
    time.sleep(random.uniform(a, b))


# ---------------- MAIN EXTRACTOR ----------------
def extract_multiple_ordinals(start_index=0, end_index=10, output_file="ordinals.json"):
    print(f"🚀 Starting extraction from index {start_index} to {end_index}")
    driver = setup_driver()
    all_data = []

    try:
        print("1️⃣ Loading Magic Eden page...")
        driver.get("https://magiceden.io/ordinals/marketplace/sub-10k")
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div[class*='pb-2']"))
        )
        random_delay(2, 4)

        # ---- scroll-aware start handling ----
        nft_cards = driver.find_elements(By.CSS_SELECTOR, "div[class*='pb-2']")
        if start_index >= len(nft_cards):
            print(
                f"⚠️ Start index {start_index} beyond current viewport "
                f"({len(nft_cards)} visible). Will scroll down to load..."
            )
            scroll_attempts = 0
            while start_index >= len(nft_cards) and scroll_attempts < 15:
                driver.execute_script("window.scrollBy(0, window.innerHeight*0.8);")
                random_delay(1.5, 2.5)
                nft_cards = driver.find_elements(By.CSS_SELECTOR, "div[class*='pb-2']")
                scroll_attempts += 1

            if start_index >= len(nft_cards):
                print(f"❌ Could not reach index {start_index}. Possibly end of list.")
                return []

        # ✅ Click starting card safely
        nft_cards[start_index].click()
        random_delay(3, 5)

        # ---- main loop ----
        for current_index in range(start_index, end_index + 1):
            print(f"\n🔹 Processing ordinal #{current_index + 1}")
            try:
                # Lazy loading guard
                max_scroll = 15
                tries = 0
                nft_cards = driver.find_elements(By.CSS_SELECTOR, "div[class*='pb-2']")
                while current_index >= len(nft_cards) and tries < max_scroll:
                    print(f"   ⏬ Scrolling down... attempt {tries + 1}")
                    driver.execute_script("window.scrollBy(0, window.innerHeight*0.8);")
                    random_delay(1.5, 2.5)
                    nft_cards = driver.find_elements(By.CSS_SELECTOR, "div[class*='pb-2']")
                    tries += 1
                if current_index >= len(nft_cards):
                    print(f"   ⚠️ Could not load index {current_index}")
                    break

                target = nft_cards[current_index]
                driver.execute_script(
                    "arguments[0].scrollIntoView({behavior:'smooth',block:'center'});",
                    target,
                )
                random_delay(1, 2)
                target.click()
                random_delay(3, 5)

                details = extract_ordinal_details_from_modal(driver, current_index)
                if details:
                    all_data.append(details)
                    with open(output_file, "w") as f:
                        json.dump(all_data, f, indent=2)

                if current_index < end_index and not click_right_arrow(driver):
                    print("   ⚠️ Right arrow failed, scrolling to next manually...")
                    driver.execute_script("window.scrollBy(0, window.innerHeight*0.8);")
                    random_delay(2, 3)

            except Exception as e:
                print(f"❌ Error at index {current_index}: {e}")
                driver.execute_script("window.scrollBy(0, window.innerHeight*0.5);")
                random_delay(2, 3)
                continue

        print(f"✅ Extracted {len(all_data)} ordinals.")
        return all_data

    except Exception as e:
        print(f"❌ Overall error: {e}")
        return all_data
    finally:
        random_delay(2, 3)
        driver.quit()

def click_right_arrow(driver):
    """Click right arrow with optimized selectors"""
    try:
        # Primary selectors for right arrow
        right_arrow_selectors = [
            "button[class*='justify-center'][class*='items-center'][class*='rounded']",
            "button svg path[d*='M10 4.16675L15.8333 10.0001L10 15.8334']",
            "button:has(svg path[d*='M10 4.16675L15.8333 10.0001L10 15.8334'])"
        ]
        
        for selector in right_arrow_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                for element in elements:
                    if element.is_displayed() and element.is_enabled():
                        element.click()
                        return True
            except:
                continue
        
        # Fallback: check all buttons
        all_buttons = driver.find_elements(By.CSS_SELECTOR, "button")
        for button in all_buttons:
            try:
                svg = button.find_element(By.CSS_SELECTOR, "svg")
                paths = svg.find_elements(By.CSS_SELECTOR, "path")
                for path in paths:
                    d_attr = path.get_attribute("d")
                    if d_attr and "M10 4.16675L15.8333 10.0001L10 15.8334" in d_attr:
                        if button.is_displayed() and button.is_enabled():
                            button.click()
                            return True
            except:
                continue
        
        return False
        
    except Exception as e:
        return False

def extract_ordinal_details_from_modal(driver, current_index):
    """Optimized ordinal extraction with ALL fallback methods"""
    
    ordinal_details = {
        'name': 'Unknown', 'inscription_number': 'Unknown', 'price': 'Unknown',
        'owner': 'Unknown', 'content_type': 'Unknown', 'created': 'Unknown',
        'location': 'Unknown', 'inscription_id': 'Unknown', 'rarity': 'Unknown',
        'sat_number': 'Unknown', 'sat_name': 'Unknown', 'genesis_transaction': 'Unknown',
        'output': 'Unknown', 'image_url': 'Unknown', 'full_details_text': 'Unknown',
        'scraped_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'ordinal_index': current_index
    }
    
    # Extract name without hash - ALL PATTERNS PRESERVED
    try:
        name_elements = driver.find_elements(By.CSS_SELECTOR, "h3.font-bold.leading-9.text-2xl.text")
        if name_elements:
            detail_text = name_elements[0].text.strip()
            
            if 'Inscription #' in detail_text:
                number_match = re.search(r'Inscription #(\d+)', detail_text)
                if number_match:
                    ordinal_details['name'] = 'Inscription ' + number_match.group(1)
            elif '#' in detail_text and not detail_text.startswith('#'):
                collection_name = detail_text.split('#')[0].strip()
                ordinal_details['name'] = collection_name if collection_name else detail_text
            elif detail_text.startswith('#') and len(detail_text) > 1:
                number_part = detail_text[1:].strip()
                ordinal_details['name'] = 'Inscription ' + number_part if number_part.isdigit() else 'Inscription'
            else:
                ordinal_details['name'] = detail_text
    except:
        pass
    
    # Extract price
    try:
        price_containers = driver.find_elements(By.CSS_SELECTOR, "div.flex.items-baseline.gap-1.text-primary")
        if price_containers:
            price_values = price_containers[0].find_elements(By.CSS_SELECTOR, "div.font-bold.text-4xl")
            price_currencies = price_containers[0].find_elements(By.CSS_SELECTOR, "div.font-semibold.text-xl")
            if price_values and price_currencies:
                price_text = price_values[0].text.strip()
                currency_text = price_currencies[0].text.strip()
                if price_text and currency_text:
                    ordinal_details['price'] = price_text + ' ' + currency_text
    except:
        pass
    
    # Click Details tab
    try:
        all_buttons = driver.find_elements(By.CSS_SELECTOR, "button")
        for button in all_buttons:
            if button.text.strip() == "Details":
                button.click()
                random_delay(2, 3)
                break
    except:
        pass
    
    # Extract details with ALL SELECTORS
    try:
        detail_selectors = [
            "div.shrink-0.grow.-mt-3\\.5",
            "div[class*='detail']",
            "div[class*='inscription']",
            "div.mantine-Paper-root",
            "div[role='dialog'] div"
        ]
        
        details_text = ""
        for selector in detail_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                for element in elements:
                    if element.is_displayed():
                        text = element.text.strip()
                        if text and len(text) > 50:
                            details_text = text
                            break
                if details_text:
                    break
            except:
                continue
        
        ordinal_details['full_details_text'] = details_text
        
        # Extract inscription number
        if details_text:
            lines = details_text.split('\n')
            for i, line in enumerate(lines):
                if line.strip() == "Inscription Number" and i + 1 < len(lines):
                    real_inscription_number = lines[i + 1].strip()
                    if real_inscription_number and real_inscription_number != '◉':
                        ordinal_details['inscription_number'] = real_inscription_number
                        break
        
        # Extract owner - ALL 3 METHODS
        try:
            # Method 1: mempool.space/address/ links
            mempool_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='mempool.space/address/']")
            if mempool_links:
                for link in mempool_links:
                    href = link.get_attribute("href")
                    if href and "mempool.space/address/" in href:
                        address = href.split("mempool.space/address/")[1]
                        ordinal_details['owner'] = address
                        break
            
            # Method 2: /u/ profile links
            if ordinal_details['owner'] == 'Unknown':
                user_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/u/']")
                if user_links:
                    for link in user_links:
                        href = link.get_attribute("href")
                        if href and "/u/" in href:
                            address_part = href.split("/u/")[1]
                            address = address_part.split("?")[0]
                            ordinal_details['owner'] = address
                            break
            
            # Method 3: Regex fallback
            if ordinal_details['owner'] == 'Unknown':
                owner_match = re.search(r'Owner\s*([^\n]+)', details_text)
                if owner_match:
                    ordinal_details['owner'] = owner_match.group(1).strip()
        except:
            pass
        
        # Extract inscription ID - WITH FALLBACK
        try:
            inscription_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/inscription/']")
            if inscription_links:
                for link in inscription_links:
                    href = link.get_attribute("href")
                    if href and "/inscription/" in href:
                        inscription_id = href.split("/inscription/")[1]
                        ordinal_details['inscription_id'] = inscription_id
                        break
            else:
                # Fallback to regex
                inscription_id_match = re.search(r'Inscription ID\s*([^\n]+)', details_text)
                if inscription_id_match:
                    ordinal_details['inscription_id'] = inscription_id_match.group(1).strip()
        except:
            pass
        
        # Extract genesis transaction - WITH FALLBACK
        try:
            genesis_containers = driver.find_elements(By.XPATH, "//div[contains(@class, 'flex') and contains(@class, 'text-sm') and contains(@class, 'leading-6') and contains(@class, 'justify-between') and contains(@class, 'items-center') and contains(@class, 'gap-x-2')]")
            
            genesis_container = None
            for container in genesis_containers:
                try:
                    genesis_label = container.find_element(By.XPATH, ".//div[contains(@class, 'text-secondary') and contains(text(), 'Genesis Transaction')]")
                    genesis_container = container
                    break
                except:
                    continue
            
            if genesis_container:
                genesis_links = genesis_container.find_elements(By.CSS_SELECTOR, "a[href*='mempool.space/tx/'], a[href*='ord-mirror.magiceden.dev/tx/']")
                
                full_genesis_hash = 'Unknown'
                if genesis_links:
                    for link in genesis_links:
                        href = link.get_attribute("href")
                        if href:
                            if "mempool.space/tx/" in href:
                                full_genesis_hash = href.split("mempool.space/tx/")[1]
                                break
                            elif "ord-mirror.magiceden.dev/tx/" in href:
                                full_genesis_hash = href.split("ord-mirror.magiceden.dev/tx/")[1]
                                break
                
                if full_genesis_hash != 'Unknown':
                    ordinal_details['genesis_transaction'] = full_genesis_hash
                else:
                    # Fallback to regex
                    genesis_match = re.search(r'Genesis Transaction\s*([^\n]+)', details_text)
                    if genesis_match:
                        ordinal_details['genesis_transaction'] = genesis_match.group(1).strip()
            else:
                # Fallback to regex
                genesis_match = re.search(r'Genesis Transaction\s*([^\n]+)', details_text)
                if genesis_match:
                    ordinal_details['genesis_transaction'] = genesis_match.group(1).strip()
        except:
            pass
        
        # Extract location and output - WITH FALLBACK
        try:
            location_containers = driver.find_elements(By.XPATH, "//div[contains(@class, 'flex') and contains(@class, 'text-sm') and contains(@class, 'leading-6') and contains(@class, 'justify-between') and contains(@class, 'items-center') and contains(@class, 'gap-x-2')]")
            
            location_container = None
            for container in location_containers:
                try:
                    location_label = container.find_element(By.XPATH, ".//div[contains(@class, 'text-secondary') and contains(text(), 'Location')]")
                    location_container = container
                    break
                except:
                    continue
            
            if location_container:
                location_links = location_container.find_elements(By.CSS_SELECTOR, "a[href*='mempool.space/tx/'], a[href*='ord-mirror.magiceden.dev/tx/']")
                
                full_tx_hash = 'Unknown'
                if location_links:
                    for link in location_links:
                        href = link.get_attribute("href")
                        if href:
                            if "mempool.space/tx/" in href:
                                full_tx_hash = href.split("mempool.space/tx/")[1]
                                break
                            elif "ord-mirror.magiceden.dev/tx/" in href:
                                full_tx_hash = href.split("ord-mirror.magiceden.dev/tx/")[1]
                                break
                
                 # 2️⃣ Find the <span role="button"> element (the truncated text)
                span_buttons = location_container.find_elements(By.CSS_SELECTOR, "span[role='button']")
                full_location = None

                if span_buttons:
                    try:
                        # Click to copy the full location to clipboard
                        driver.execute_script("navigator.clipboard.writeText('');")  # clear clipboard
                        span_buttons[0].click()
                        time.sleep(0.5)  # short wait for copy to complete
                        
                        # Read clipboard value directly inside browser
                        full_location = driver.execute_script("return navigator.clipboard.readText();")
                    except Exception as e:
                        print(f"⚠️ Clipboard read failed: {e}")
                
                # 3️⃣ Assign values
                if full_location:
                    ordinal_details['location'] = full_location
                    if ':' in full_location:
                        ordinal_details['output'] = full_location.rsplit(':', 1)[0]
                elif full_tx_hash:
                    # fallback: best effort
                    ordinal_details['location'] = full_tx_hash
                    ordinal_details['output'] = full_tx_hash
                else:
                    # regex fallback
                    location_match = re.search(r'Location\s*([^\n]+)', details_text)
                    if location_match:
                        ordinal_details['location'] = location_match.group(1).strip()
        except:
            pass
        
        # Extract sat info - ORIGINAL LOGIC
        if details_text:
            lines = details_text.split('\n')
            
            # Sat Number
            for i, line in enumerate(lines):
                if line.strip() == "Sat Number" and i + 2 < len(lines):
                    sat_number = lines[i + 2].strip()
                    if sat_number and sat_number != '◉':
                        ordinal_details['sat_number'] = sat_number
                        break
            
            # Sat Name
            for i, line in enumerate(lines):
                if line.strip() == "Sat Name" and i + 2 < len(lines):
                    sat_name = lines[i + 2].strip()
                    if sat_name and sat_name != '◉':
                        ordinal_details['sat_name'] = sat_name
                        break
        
        # Construct image URL
        if ordinal_details['inscription_id'] != 'Unknown':
            image_url = f"https://ord-mirror.magiceden.dev/content/{ordinal_details['inscription_id']}"
            ordinal_details['image_url'] = image_url
        
        # Extract other fields
        if details_text:
            content_type_match = re.search(r'Content Type\s*([^\n]+)', details_text)
            if content_type_match:
                ordinal_details['content_type'] = content_type_match.group(1).strip()
            
            created_match = re.search(r'Created\s*([^\n]+)', details_text)
            if created_match:
                ordinal_details['created'] = created_match.group(1).strip()
            
            rarity_match = re.search(r'Rarity\s*([^\n]+)', details_text)
            if rarity_match:
                ordinal_details['rarity'] = rarity_match.group(1).strip()
                
    except Exception as e:
        pass
    
    return ordinal_details

if __name__ == "__main__":
    START_INDEX = 44
    END_INDEX = 100
    OUTPUT_FILE = 'sub10k1_ordinals_data.json'
    
    all_data = extract_multiple_ordinals(
        start_index=START_INDEX,
        end_index=END_INDEX,
        output_file=OUTPUT_FILE
    )
    
    if all_data:
        print(f"💾 Final data saved to {OUTPUT_FILE}")
        print(f"📊 Total ordinals extracted: {len(all_data)}")
    else:
        print("❌ No data was extracted.")