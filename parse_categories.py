import urllib.request
from bs4 import BeautifulSoup

def inspect_category(slug):
    url = f"https://entertainlawyers.com/category/{slug}/"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read()
        soup = BeautifulSoup(html, 'html.parser')
        
        title = soup.find('h1')
        print(f"\n=== URL: {url} ===")
        print(f"Title: {title.get_text(strip=True) if title else 'No H1'}")
        
        # Breadcrumbs (Yoast/RankMath often use .breadcrumb or similar classes)
        breadcrumbs = soup.find(class_='rank-math-breadcrumb') or soup.find(class_='breadcrumbs')
        if breadcrumbs:
            print("Breadcrumbs:", breadcrumbs.get_text(separator=" > ", strip=True))
        else:
            print("Breadcrumbs: None found")
            
        posts = soup.find_all('article')
        print(f"Posts found on page: {len(posts)}")
        if posts:
            for p in posts[:3]:
                h2 = p.find('h2')
                if h2:
                    print(f" - {h2.get_text(strip=True)}")
    except urllib.error.HTTPError as e:
        print(f"Error {e.code} for {url}")
    except Exception as e:
        print(f"Error fetching {url}: {e}")

inspect_category('corporate-law-and-management')
inspect_category('criminology-and-penology')
inspect_category('election-law')
inspect_category('fiscal-law')
inspect_category('gender-and-inclusive-justice')
inspect_category('interpretation-of-law')
inspect_category('juvenile-delinquency')
inspect_category('socio-economic-crime')
inspect_category('family-law')
inspect_category('precedent')
inspect_category('civil')
inspect_category('criminal')
inspect_category('writs')

