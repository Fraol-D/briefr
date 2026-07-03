import json
import re

import httpx

SEARCH_MARKERS = (
    "google.com/search",
    "www.google.com/search",
    "bing.com/search",
    "duckduckgo.com/",
)


def classify(url: str) -> str:
    lower = url.lower()
    if any(marker in lower for marker in SEARCH_MARKERS):
        return "SEARCH_PAGE"
    if "google.com" in lower and "q=" in lower:
        return "SEARCH_PAGE"
    return "SOURCE_PAGE"


def resolve_citation(label: str, href: str) -> None:
    chain = []
    with httpx.Client(
        follow_redirects=False,
        timeout=20.0,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        },
    ) as client:
        url = href
        response = None
        for hop in range(10):
            response = client.get(url)
            chain.append({"hop": hop, "url": str(response.url), "status": response.status_code})
            if response.status_code in (301, 302, 303, 307, 308):
                location = response.headers.get("location")
                if not location:
                    break
                url = location
                continue
            break

    final_url = str(response.url) if response else href
    title = ""
    if response and response.status_code == 200:
        content_type = response.headers.get("content-type", "")
        if "text/html" in content_type:
            match = re.search(r"<title[^>]*>(.*?)</title>", response.text[:5000], re.I | re.S)
            if match:
                title = re.sub(r"\s+", " ", match.group(1)).strip()[:160]

    print(f"--- {label} ---")
    print(f"href_in_report: {href[:110]}...")
    print("redirect_chain:")
    for step in chain:
        print(f"  hop {step['hop']}: {step['status']} {step['url'][:120]}")
    print(f"final_url: {final_url}")
    print(f"page_title: {title!r}")
    print(f"classification: {classify(final_url)}")
    print(f"http_status: {response.status_code if response else 'n/a'}")


def main() -> None:
    with open("_citation_test_sources.json", encoding="utf-8") as handle:
        data = json.load(handle)

    sections = data["sections"]
    picks = [
        ("Citation 1 — Section 1, badge 1", sections[0]["sources"][0]),
        ("Citation 2 — Section 1, badge 2", sections[0]["sources"][1]),
        ("Citation 3 — Section 2, badge 1", sections[1]["sources"][0]),
    ]

    print("fresh_report_question: What are the health benefits of drinking green tea?")
    print(f"unique_sources_in_report: {len(data['sources'])}")
    print()
    for label, href in picks:
        resolve_citation(label, href)
        print()


if __name__ == "__main__":
    main()