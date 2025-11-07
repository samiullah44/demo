import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import re

def extract_ordinal_data():
    print("🚀 Starting ordinal data extraction...")
    
    # Create driver
    driver = webdriver.Chrome()
    
    try:
        # Step 1: Load the page and maximize to full screen
        print("1. Loading Magic Eden page...")
        driver.get("https://magiceden.io/ordinals/marketplace/sub-10k")
        driver.maximize_window()
        
        # Step 2: Wait for content to load
        print("2. Waiting for content to load...")
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div[class*='pb-2']"))
        )
        print("✅ Content loaded!")
        time.sleep(3)
        
        ordinal_data = []
        processed_numbers = set()
        
        # Step 3: Process cards one by one
        i = 1
        cards_processed = 0
        max_cards = 10
        
        while cards_processed < max_cards and i < 20:
            print(f"\n🔄 Checking Card at position {i+1}...")
            
            try:
                # Freshly find all cards each time
                nft_cards = driver.find_elements(By.CSS_SELECTOR, "div[class*='pb-2']")
                print(f"   Found {len(nft_cards)} cards available")
                
                if i >= len(nft_cards):
                    print("   ❌ No more cards available")
                    break
                
                # Get basic info from card before clicking
                card_text = nft_cards[i].text
                lines = [line.strip() for line in card_text.split('\n') if line.strip()]
                
                # Extract inscription number from any line
                inscription_number = 'Unknown'
                for line in lines:
                    if '#' in line:
                        number_match = re.search(r'#(\d+)', line)
                        if number_match:
                            inscription_number = '#' + number_match.group(1)
                            break
                
                # Skip if duplicate
                if inscription_number != 'Unknown' and inscription_number in processed_numbers:
                    print(f"   ⚠️ SKIPPING - Already processed {inscription_number}")
                    i += 1
                    continue
                
                ordinal = {
                    'index': cards_processed + 1,
                    'name': 'Unknown',
                    'inscription_number': 'Unknown',
                    'image_url': 'Unknown',
                    'price': 'Unknown'
                }
                
                # Scroll to the current card
                driver.execute_script("arguments[0].scrollIntoView();", nft_cards[i])
                time.sleep(2)
                
                # Click on the card to open details
                print(f"   Clicking on card position {i+1}...")
                nft_cards[i].click()
                time.sleep(5)
                
                # EXTRACT NAME AND NUMBER FROM DETAIL VIEW
                try:
                    # Look for the h3 element with the specific classes
                    name_elements = driver.find_elements(By.CSS_SELECTOR, "h3.font-bold.leading-9.text-2xl.text")
                    if name_elements:
                        detail_text = name_elements[0].text.strip()
                        print(f"   Detail text found: '{detail_text}'")
                        
                        # Check if it contains "Inscription #"
                        if 'Inscription #' in detail_text:
                            # Format: "Inscription #6896" - extract number only
                            number_match = re.search(r'Inscription #(\d+)', detail_text)
                            if number_match:
                                ordinal['inscription_number'] = '#' + number_match.group(1)
                                ordinal['name'] = 'Inscription ' + number_match.group(1)
                                print(f"   Extracted from 'Inscription #': {ordinal['name']}")
                        else:
                            # Could be a custom name or just the number
                            if '#' in detail_text:
                                # Contains # but not "Inscription" - might be custom name with number
                                number_match = re.search(r'#(\d+)', detail_text)
                                if number_match:
                                    ordinal['inscription_number'] = '#' + number_match.group(1)
                                    # Use the full text as name (could be custom name)
                                    ordinal['name'] = detail_text
                                    print(f"   Custom name with number: {ordinal['name']}")
                            else:
                                # No # found - might be just a custom name
                                ordinal['name'] = detail_text
                                print(f"   Custom name only: {ordinal['name']}")
                except Exception as e:
                    print(f"   Detail name extraction failed: {e}")
                
                # If we didn't get number from detail view, use the one from card
                if ordinal['inscription_number'] == 'Unknown' and inscription_number != 'Unknown':
                    ordinal['inscription_number'] = inscription_number
                    # If name is still unknown, use the number as name
                    if ordinal['name'] == 'Unknown':
                        ordinal['name'] = 'Inscription ' + inscription_number.replace('#', '')
                    print(f"   Using card number: {ordinal['name']}")
                
                # If we still don't have a name, try other methods
                if ordinal['name'] == 'Unknown':
                    try:
                        # Look for any text that could be a name
                        name_elements = driver.find_elements(By.CSS_SELECTOR, "h1, h2, h3, [class*='name'], [class*='title']")
                        for name_el in name_elements:
                            name_text = name_el.text.strip()
                            if name_text and name_text != 'Unknown' and len(name_text) < 50:
                                ordinal['name'] = name_text
                                print(f"   Found name from other element: {ordinal['name']}")
                                break
                    except Exception as e:
                        print(f"   Fallback name extraction failed: {e}")
                
                # Final duplicate check
                if ordinal['inscription_number'] != 'Unknown' and ordinal['inscription_number'] in processed_numbers:
                    print(f"   ⚠️ DUPLICATE FOUND: {ordinal['inscription_number']} - Skipping")
                    driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
                    time.sleep(3)
                    i += 1
                    continue
                
                try:
                    # Extract price from detail view
                    price_containers = driver.find_elements(By.CSS_SELECTOR, "div.flex.items-baseline.gap-1.text-primary")
                    if price_containers:
                        price_values = price_containers[0].find_elements(By.CSS_SELECTOR, "div.font-bold.text-4xl")
                        price_currencies = price_containers[0].find_elements(By.CSS_SELECTOR, "div.font-semibold.text-xl")
                        
                        if price_values and price_currencies:
                            price_text = price_values[0].text.strip()
                            currency_text = price_currencies[0].text.strip()
                            if price_text and currency_text:
                                ordinal['price'] = price_text + ' ' + currency_text
                                print(f"   Found price: {ordinal['price']}")
                except Exception as e:
                    print(f"   Price extraction failed: {e}")

                
                # EXTRACT IMAGE/CONTENT URL - IMPROVED METHOD
                try:
                    # Method 1: First try to find image via img tag (for image ordinals)
                    img_element = nft_cards[i].find_element(By.TAG_NAME, "img")
                    src = img_element.get_attribute("src")
                    if src:
                        ordinal['image_url'] = src
                        print(f"   Image found via img tag")
                except Exception as e:
                    print(f"   No img tag found - this might be text/audio/video ordinal")
                    
                   # Method 2: If no img tag found, search for inscription URL using Magic Eden pattern
                    try:
                        print("   Searching for inscription URL using Magic Eden pattern...")
                        
                        # First, try to find the detail modal/container for this specific ordinal
                        modal_selectors = [
                            "div[role='dialog']",
                            "div[class*='modal']",
                            "div[class*='drawer']",
                            "div[class*='overlay']",
                            "div[class*='detail']",
                            "div[class*='inscription']"
                        ]
                        
                        modal_container = None
                        for selector in modal_selectors:
                            try:
                                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                                for element in elements:
                                    if element.is_displayed():
                                        modal_container = element
                                        print(f"   Found modal container with selector: {selector}")
                                        break
                                if modal_container:
                                    break
                            except:
                                continue
                        
                        # If we found a modal container, search only within it
                        if modal_container:
                            modal_html = modal_container.get_attribute("innerHTML")
                            
                            # Look for Magic Eden content URL pattern in the modal
                            content_pattern = r'https://ord-mirror\.magiceden\.dev/content/[a-f0-9]{64}i\d+'
                            content_matches = re.findall(content_pattern, modal_html)
                            
                            if content_matches:
                                # Use the first URL found in this specific modal
                                ordinal['image_url'] = content_matches[0]
                                print(f"   Found content URL in modal: {content_matches[0][:80]}...")
                            else:
                                # Alternative: Look for inscription ID only in this modal
                                id_pattern = r'[a-f0-9]{64}i\d+'
                                id_matches = re.findall(id_pattern, modal_html)
                                if id_matches:
                                    # Use the first ID found in this specific modal
                                    inscription_id = id_matches[0]
                                    ordinal['image_url'] = f"https://ord-mirror.magiceden.dev/content/{inscription_id}"
                                    print(f"   Constructed content URL from modal ID: {inscription_id}")
                        else:
                            # Fallback: If no modal found, try to find content in visible elements
                            print("   No modal container found, searching visible content...")
                            visible_elements = driver.find_elements(By.CSS_SELECTOR, "*")
                            for element in visible_elements:
                                if element.is_displayed():
                                    element_html = element.get_attribute("outerHTML")
                                    if element_html:
                                        # Look for content URL in this specific element
                                        content_pattern = r'https://ord-mirror\.magiceden\.dev/content/[a-f0-9]{64}i\d+'
                                        content_match = re.search(content_pattern, element_html)
                                        if content_match:
                                            ordinal['image_url'] = content_match.group()
                                            print(f"   Found content URL in visible element: {content_match.group()[:80]}...")
                                            break
                                        
                                        # Look for inscription ID in this specific element
                                        id_pattern = r'[a-f0-9]{64}i\d+'
                                        id_match = re.search(id_pattern, element_html)
                                        if id_match:
                                            inscription_id = id_match.group()
                                            ordinal['image_url'] = f"https://ord-mirror.magiceden.dev/content/{inscription_id}"
                                            print(f"   Constructed URL from visible element ID: {inscription_id}")
                                            break
                                            
                    except Exception as e:
                        print(f"   Content URL search failed: {e}")
                
                # Add to processed numbers and results
                if ordinal['inscription_number'] != 'Unknown':
                    processed_numbers.add(ordinal['inscription_number'])
                
                ordinal_data.append(ordinal)
                cards_processed += 1
                print(f"   ✅ Successfully processed: {ordinal['name']} ({ordinal['inscription_number']})")
                
                # Close detail view
                print(f"   Closing detail view...")
                driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
                time.sleep(4)
                
                i += 1
                
            except Exception as e:
                print(f"   ❌ Error processing card: {e}")
                try:
                    driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
                    time.sleep(3)
                except:
                    pass
                i += 1
        
        # Display results
        print(f"\n✅ Extracted {len(ordinal_data)} unique ordinals:")
        print("=" * 80)
        
        for ordinal in ordinal_data:
            print(f"\n🔄 Ordinal #{ordinal['index']}")
            print(f"   Name: {ordinal['name']}")
            print(f"   Number: {ordinal['inscription_number']}")
            print(f"   Price: {ordinal['price']}")
            if ordinal['image_url'] != 'Unknown':
                print(f"   Image: {ordinal['image_url'][:80]}...")
        
        # Show summary
        print(f"\n📊 SUMMARY:")
        print(f"   Total unique ordinals: {len(ordinal_data)}")
        print(f"   Names found: {len([o for o in ordinal_data if o['name'] != 'Unknown'])}")
        print(f"   Numbers found: {len([o for o in ordinal_data if o['inscription_number'] != 'Unknown'])}")
        print(f"   Prices found: {len([o for o in ordinal_data if o['price'] != 'Unknown'])}")
        print(f"   Images found: {len([o for o in ordinal_data if o['image_url'] != 'Unknown'])}")
        
        return ordinal_data
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []
    
    finally:
        print("\nBrowser will close in 10 seconds...")
        time.sleep(10)
        driver.quit()

if __name__ == "__main__":
    data = extract_ordinal_data()
    
    if data:
        import json
        with open('ordinals_data.json', 'w') as f:
            json.dump(data, f, indent=2)
        print("💾 Data saved to ordinals_data.json")