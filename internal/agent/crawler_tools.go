package agent

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"cloud.google.com/go/firestore"
	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	"golang.org/x/net/html"
	"google.golang.org/adk/tool"
	"google.golang.org/adk/tool/functiontool"
)

type SitemapRequest struct {
	URL string `json:"url"`
}

type SitemapResponse struct {
	URLs []string `json:"urls"`
}

type ScrapeRequest struct {
	URL string `json:"url"`
}

type ScrapeResponse struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	TextContent string   `json:"text_content"`
	Images      []string `json:"images"`
}

func getMD5Hash(text string) string {
	hasher := md5.New()
	hasher.Write([]byte(text))
	return hex.EncodeToString(hasher.Sum(nil))
}

func crawlSitemapHandler(ctx tool.Context, req SitemapRequest) (SitemapResponse, error) {
	resp, err := http.Get(req.URL)
	if err != nil {
		return SitemapResponse{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return SitemapResponse{}, fmt.Errorf("failed to fetch sitemap, status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return SitemapResponse{}, err
	}

	type Url struct {
		Loc string `xml:"loc"`
	}
	type Urlset struct {
		Urls []Url `xml:"url"`
	}

	var urlset Urlset
	err = xml.Unmarshal(body, &urlset)
	if err != nil {
		return SitemapResponse{}, fmt.Errorf("failed to parse sitemap: %v", err)
	}

	var urls []string
	for _, u := range urlset.Urls {
		urls = append(urls, u.Loc)
	}

	return SitemapResponse{URLs: urls}, nil
}

func scrapePageHandler(ctx tool.Context, req ScrapeRequest) (ScrapeResponse, error) {
	cacheHash := getMD5Hash(req.URL)
	cacheDir := ".cache"
	cacheFile := filepath.Join(cacheDir, cacheHash+".html")

	var bodyReader io.Reader

	if _, err := os.Stat(cacheFile); err == nil {
		f, err := os.Open(cacheFile)
		if err != nil {
			return ScrapeResponse{}, err
		}
		defer f.Close()

		bodyBytes, err := io.ReadAll(f)
		if err != nil {
			return ScrapeResponse{}, err
		}
		bodyReader = strings.NewReader(string(bodyBytes))
	} else {
		if err := os.MkdirAll(cacheDir, 0755); err != nil {
			return ScrapeResponse{}, err
		}

		resp, err := http.Get(req.URL)
		if err != nil {
			return ScrapeResponse{}, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			return ScrapeResponse{}, fmt.Errorf("failed to fetch page, status: %d", resp.StatusCode)
		}

		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			return ScrapeResponse{}, err
		}

		if err := os.WriteFile(cacheFile, bodyBytes, 0644); err != nil {
			return ScrapeResponse{}, err
		}

		bodyReader = strings.NewReader(string(bodyBytes))
	}

	doc, err := html.Parse(bodyReader)
	if err != nil {
		return ScrapeResponse{}, err
	}

	var res ScrapeResponse

	var extractText func(*html.Node) string
	extractText = func(n *html.Node) string {
		if n.Type == html.ElementNode && (n.Data == "script" || n.Data == "style" || n.Data == "noscript") {
			return ""
		}
		if n.Type == html.TextNode {
			return n.Data
		}

		var text string
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			text += extractText(c) + " "
		}
		return text
	}

	var f func(*html.Node)
	f = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "title" && n.FirstChild != nil {
			res.Title = n.FirstChild.Data
		}
		if n.Type == html.ElementNode && n.Data == "meta" {
			var isDesc bool
			var cnt string
			for _, a := range n.Attr {
				if a.Key == "name" && strings.ToLower(a.Val) == "description" {
					isDesc = true
				}
				if a.Key == "content" {
					cnt = a.Val
				}
			}
			if isDesc {
				res.Description = cnt
			}
		}
		if n.Type == html.ElementNode && n.Data == "img" {
			for _, a := range n.Attr {
				if a.Key == "src" {
					res.Images = append(res.Images, a.Val)
				}
			}
		}

		if n.Type == html.ElementNode && n.Data == "body" {
			text := extractText(n)
			text = strings.Join(strings.Fields(text), " ")
			res.TextContent = text
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(doc)

	if len(res.TextContent) > 5000 {
		res.TextContent = res.TextContent[:5000] + "..."
	}

	return res, nil
}

func CreateSitemapCrawlerTool() (tool.Tool, error) {
	return functiontool.New(functiontool.Config{
		Name:        "crawl_sitemap",
		Description: "Fetches a sitemap.xml URL and returns a list of discovered URLs. Useful to explore the structure and available pages on a target website.",
	}, crawlSitemapHandler)
}

func CreatePageScraperTool() (tool.Tool, error) {
	return functiontool.New(functiontool.Config{
		Name:        "scrape_page",
		Description: "Downloads a given URL, caches it locally, parses the HTML, and extracts the title, meta description, text content, and image URLs.",
	}, scrapePageHandler)
}

type StorePageSummaryRequest struct {
	TargetURL string `json:"target_url"`
	URL       string `json:"url"`
	Summary   string `json:"summary"`
}

type StorePageSummaryResponse struct {
	Status string `json:"status"`
}

func CreateStorePageSummaryTool(dbClient *firestore.Client) (tool.Tool, error) {
	handler := func(ctx tool.Context, req StorePageSummaryRequest) (StorePageSummaryResponse, error) {
		docID := getMD5Hash(req.URL)

		_, err := dbClient.Collection("page_summaries").Doc(docID).Set(ctx, map[string]interface{}{
			"targetUrl": req.TargetURL,
			"url":       req.URL,
			"summary":   req.Summary,
		})

		if err != nil {
			return StorePageSummaryResponse{}, fmt.Errorf("failed to save page summary: %v", err)
		}

		return StorePageSummaryResponse{Status: "success"}, nil
	}

	return functiontool.New(functiontool.Config{
		Name:        "store_page_summary",
		Description: "Stores a page-by-page summary for a scraped URL into the database. Call this immediately after synthesizing findings from a page.",
	}, handler)
}

type SaveExtractedFieldRequest struct {
	FieldName  string `json:"field_name"`
	FieldValue string `json:"field_value"`
}

type SaveExtractedFieldResponse struct {
	Status string `json:"status"`
}

// CreateSaveExtractedFieldTool allows the ExtractionAgent to save directly to the Master Profile's DynamicFields
func CreateSaveExtractedFieldTool(dbClient *db.Client) (tool.Tool, error) {
	handler := func(ctx tool.Context, req SaveExtractedFieldRequest) (SaveExtractedFieldResponse, error) {
		// Update the master profile dynamic fields
		// Fetch the current profile
		doc, err := dbClient.Firestore.Collection("profiles").Doc("master").Get(context.Background())
		if err != nil {
			return SaveExtractedFieldResponse{}, fmt.Errorf("failed to get master profile: %v", err)
		}

		var profile db.Profile
		if err := doc.DataTo(&profile); err != nil {
			return SaveExtractedFieldResponse{}, fmt.Errorf("failed to parse profile: %v", err)
		}

		if profile.DynamicFields == nil {
			profile.DynamicFields = make(map[string]string)
		}

		profile.DynamicFields[req.FieldName] = req.FieldValue

		_, err = dbClient.Firestore.Collection("profiles").Doc("master").Set(context.Background(), profile)
		if err != nil {
			return SaveExtractedFieldResponse{}, fmt.Errorf("failed to save master profile: %v", err)
		}

		return SaveExtractedFieldResponse{Status: "success - field saved to master profile"}, nil
	}

	return functiontool.New(functiontool.Config{
		Name:        "save_extracted_field",
		Description: "Saves an extracted piece of information directly to the company's Master Profile dynamic fields. MUST be called once a piece of targeted information is found.",
	}, handler)
}
