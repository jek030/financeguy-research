package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"time"

	"github.com/joho/godotenv"
)

type Quote struct {
	Symbol        string  `json:"symbol"`
	Date          string  `json:"date"`
	Open          float64 `json:"open"`
	High          float64 `json:"high"`
	Low           float64 `json:"low"`
	Close         float64 `json:"close"`
	Volume        int64   `json:"volume"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"changePercent"`
}

func loadEnv() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found. Using system environment variables.")
	}
}

func fetchQuotes(symbol, fmpKey string) ([]Quote, error) {
	url := fmt.Sprintf("https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=%s&apikey=%s", symbol, fmpKey)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var quotes []Quote
	if err := json.NewDecoder(resp.Body).Decode(&quotes); err != nil {
		return nil, err
	}
	if len(quotes) == 0 {
		return nil, fmt.Errorf("no data for %s", symbol)
	}

	// Sort quotes by date in descending order (most recent first)
	sort.Slice(quotes, func(i, j int) bool {
		dateI, _ := time.Parse("2006-01-02", quotes[i].Date)
		dateJ, _ := time.Parse("2006-01-02", quotes[j].Date)
		return dateI.After(dateJ)
	})

	return quotes, nil
}

func insertIntoSupabase(quote *Quote, supabaseUrl, supabaseKey string) error {
	payload := map[string]interface{}{
		"symbol":        quote.Symbol,
		"date":          quote.Date,
		"open":          quote.Open,
		"high":          quote.High,
		"low":           quote.Low,
		"close":         quote.Close,
		"volume":        quote.Volume,
		"change":        quote.Change,
		"changePercent": quote.ChangePercent,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", supabaseUrl+"/rest/v1/sectors", bytes.NewBuffer(body))
	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "resolution=merge-duplicates") // UPSERT behavior

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("supabase returned status %d", resp.StatusCode)
	}
	return nil
}

func main() {
	loadEnv()

	fmpKey := os.Getenv("FMP_API_KEY")
	supabaseUrl := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if fmpKey == "" || supabaseUrl == "" || supabaseKey == "" {
		log.Fatal("Missing environment variables")
	}

	symbols := []string{"XLE", "XLC", "XLP", "XLV", "XLU", "XLRE", "XLI", "XLY", "XLB", "XLK"}

	for _, symbol := range symbols {
		fmt.Printf("Fetching %s... ", symbol)

		quotes, err := fetchQuotes(symbol, fmpKey)
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			continue
		}

		fmt.Printf("Found %d quotes. ", len(quotes))

		// Only insert the most recent quote (first one after sorting)
		if len(quotes) > 0 {
			fmt.Printf("Inserting most recent quote from %s... ", quotes[0].Date)

			err = insertIntoSupabase(&quotes[0], supabaseUrl, supabaseKey)
			if err != nil {
				fmt.Printf("❌ Failed to insert: %v\n", err)
			} else {
				fmt.Println("✅ Inserted.")
			}
		}
	}
}
