import requests
import pandas as pd
import json
import csv
from datetime import datetime
import time

# === API Fetch Function ===
def fetch_inscription_details(inscription_id):
    """
    Fetch inscription data using multiple fallback APIs.
    """
    apis = [
        f"https://api.hiro.so/ordinals/v1/inscriptions/{inscription_id}",
        f"https://ordapi.xyz/api/inscription/{inscription_id}",
        f"https://ordinalsbot.com/api/inscription/{inscription_id}",
        f"https://api.ordiscan.com/v1/inscription/{inscription_id}"
    ]

    for url in apis:
        try:
            response = requests.get(url, headers={"Accept": "application/json"}, timeout=20)
            if response.status_code == 200:
                try:
                    return response.json()
                except json.JSONDecodeError:
                    return {"raw_html": response.text}
        except requests.RequestException:
            continue

    return None


# === Extract Key Info ===
def extract_fields(data, inscription_id, name, price):
    """
    Extract the key fields and return a clean record.
    """
    if not data:
        return {
            "name": name,
            "inscription_id": inscription_id,
            "price": price,
            "owner": "N/A",
            "image_url": "N/A",
            "previous": "N/A",
            "root": "N/A",
            "mime_type": "N/A",
            "content_type": "N/A",
            "inscription_number": "N/A",
            "Sat_Rarity":" N/A",
            "genesis_tx": "N/A",
            "location": "N/A",
            "value": "N/A",
            "timestamp": "N/A",
            "fetched_at": datetime.utcnow().isoformat(),

        }

    return {
        "name": data.get("title") or data.get("name") or name,
        "inscription_id": inscription_id,
        "price": data.get("price") or data.get("listed_price") or price or "N/A",
        "owner": data.get("owner") or data.get("address") or data.get("owner_address") or "N/A",
        "image_url": data.get("image") or data.get("content") or data.get("content_url") or "N/A",
        "previous": data.get("prev") or data.get("previous") or "N/A",
        "root": data.get("root") or "N/A",
        "mime_type": data.get("mime_type") or data.get("mime") or "N/A",
        "content_type": data.get("content_type") or data.get("content_type") or "N/A",
        "inscription_number": data.get("inscription_number") or data.get("number") or "N/A",
        "Sat_Rarity": data.get("sat_rarity") or data.get("rarity") or "N/A",
        "genesis_tx": data.get("genesis_tx") or data.get("genesis_transaction") or "N/A",
        "location": data.get("location") or "N/A",  # Essential for buy/sell
        "value": data.get("value") or "N/A",
        "timestamp": data.get("timestamp") or data.get("created_at") or "N/A",
        "fetched_at": datetime.utcnow().isoformat(),
    }


# === Save JSON & CSV ===
def save_results(data_list):
    json_filename = "inscriptions_full_data.json"
    csv_filename = "inscriptions_full_data.csv"

    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(data_list, f, indent=2, ensure_ascii=False)
    print(f"💾 JSON saved: {json_filename}")

    keys = data_list[0].keys() if data_list else []
    with open(csv_filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(data_list)
    print(f"📊 CSV saved: {csv_filename}")


# === Main Runner ===
def main():
    input_file = "scraped_data_nfts.csv"  # your source file
    df = pd.read_csv(input_file)

    results = []

    print(f"📘 Loaded {len(df)} inscriptions from {input_file}\n")

    for idx, row in df.iterrows():
        inscription_id = str(row["inscription_id"]).strip()
        name = str(row["name"]).strip()
        price = str(row["price"]).strip() if "price" in row and not pd.isna(row["price"]) else "N/A"

        if inscription_id.lower() == "unknown" or not inscription_id or inscription_id == "nan":
            print(f"⏭️ Skipping row {idx}: Missing inscription ID.")
            continue

        print(f"🔎 [{idx}] Fetching details for {name} ({inscription_id})...")

        data = fetch_inscription_details(inscription_id)
        record = extract_fields(data, inscription_id, name, price)
        results.append(record)

        # Optional: delay to avoid rate-limiting
        time.sleep(1)

    save_results(results)
    print("✅ All inscription details fetched and saved!")


if __name__ == "__main__":
    main()
