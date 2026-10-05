import urllib.request
from bs4 import BeautifulSoup
import re

url = "https://entertainlawyers.com/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read()
    soup = BeautifulSoup(html, 'html.parser')
    
    # Extract menu items
    print("=== Main Menu Navigation ===")
    menus = soup.find_all('nav')
    for nav in menus:
        links = nav.find_all('a')
        for a in links:
            print(f"- {a.get_text(strip=True)} -> {a.get('href')}")
            
    # Extract all category links
    print("\n=== Category Links on Homepage ===")
    cat_links = soup.find_all('a', href=re.compile(r'/category/'))
    for c in cat_links:
        print(f"- {c.get_text(strip=True)} -> {c.get('href')}")
except Exception as e:
    print("Error:", e)
