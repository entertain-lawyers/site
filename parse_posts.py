import urllib.request
from bs4 import BeautifulSoup

def inspect_post(slug):
    url = f"https://entertainlawyers.com/{slug}/"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read()
        soup = BeautifulSoup(html, 'html.parser')
        
        print(f"\n=== POST URL: {url} ===")
        title = soup.find('h1')
        print(f"Title: {title.get_text(strip=True) if title else 'No H1'}")
        
        # Look for category labels
        cat_links = soup.select('.cat-links a') or soup.select('.category a') or soup.find_all('a', rel='category tag')
        cats = [a.get_text(strip=True) for a in cat_links]
        print(f"Categories shown on page: {cats}")
        
        content = soup.find('div', class_='entry-content')
        if content:
            text = content.get_text(separator=" ", strip=True)[:300]
            print(f"Content excerpt: {text}")
            
            if 'semester' in text.lower():
                print(">>> SEMESTER MENTIONED IN CONTENT <<<")
    except urllib.error.HTTPError as e:
        print(f"Error {e.code} for {url}")
    except Exception as e:
        print(f"Error fetching {url}: {e}")

# Use the exact post slugs from our DB parsing phase
inspect_post('corporate-law-case-jones-vs-lipman-6th-semester')
inspect_post('criminology-and-penology-case-sunil-babu-panta-vs-nepal-government')
inspect_post('election-law-case-som-prasad-sapkota-v-election-commission')
