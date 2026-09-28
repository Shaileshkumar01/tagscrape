import requests
from bs4 import BeautifulSoup

def scrape_website(url):
    data = {
        "title": None,
        "meta_title":None,
        "meta_description":None,
        "meta_keywords":None,
        "headings":{
            "h1":[],
            "h2":[],
            "h3":[],
            "h4":[],
            "h5":[],
            "h6":[]
        }
        
    }
    try:
        headers= {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response=requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")

        data["title"] = soup.title.string if soup.title else None

        meta_title = soup.find("meta", attrs={"name": "title"})
        data["meta_title"] = meta_title.get("content") if meta_title else None

        meta_description = soup.find("meta", attrs={"name": "description"})
        data["meta_description"] = meta_description.get("content") if meta_description else None

        meta_keywords = soup.find("meta", attrs={"name": "keywords"})
        data["meta_keywords"] = meta_keywords.get("content") if meta_keywords else None

        for i in range(1, 7):
            headings = soup.find_all(f"h{i}")
            data["headings"][f"h{i}"] = [heading.get_text(strip=True) for heading in headings]
        
        return data, None

    except Exception as e:
        return None, str(e) 


if __name__ == "__main__":
    # Import json just for pretty-printing our test output
    import json
    
    # Pick a URL you know has meta tags (maybe the bluella.in site from your database?)
    test_url = "https://www.bluella.in/" 
    
    print(f"Testing scraper on: {test_url} ...\n")
    
    data, error = scrape_website(test_url)
    
    if error:
        print(f"Scraping failed! Error: {error}")
    else:
        # This will print your dictionary nicely formatted
        print(json.dumps(data, indent=2))
