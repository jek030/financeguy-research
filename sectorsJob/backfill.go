package main

import (
	"fmt"
	"log"
	"os"
	"time"
)

// BackfillCommand can be run as a separate process to backfill historical data
func BackfillCommand() {
	loadEnv()

	fmpKey := os.Getenv("FMP_API_KEY")
	supabaseUrl := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if fmpKey == "" || supabaseUrl == "" || supabaseKey == "" {
		log.Fatal("Missing environment variables")
	}

	// Default symbols if none provided
	symbols := []string{"XLF", "XLE", "XLC", "XLP", "XLV", "XLU", "XLRE", "XLI", "XLY", "XLB", "XLK"}

	// If symbols are provided as arguments, use those instead
	if len(os.Args) > 2 {
		symbols = os.Args[2:] // Skip program name and "backfill" arg
	}

	log.Println("Starting historical backfill of sector data for symbols:", symbols)

	for _, symbol := range symbols {
		fmt.Printf("Fetching %s... ", symbol)

		quotes, err := fetchQuotes(symbol, fmpKey)
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			continue
		}

		fmt.Printf("Found %d quotes. ", len(quotes))

		// Insert all historical quotes
		for i, quote := range quotes {
			fmt.Printf("\rInserting quote %d/%d for %s...", i+1, len(quotes), symbol)

			err = insertIntoSupabase(&quote, supabaseUrl, supabaseKey)
			if err != nil {
				fmt.Printf(" ❌ Failed: %v\n", err)
				break
			}

			// Brief pause to avoid overwhelming the API
			time.Sleep(100 * time.Millisecond)
		}
		fmt.Println(" ✅ Complete.")
	}

	log.Println("Backfill completed successfully!")
}
