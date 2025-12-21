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
	if fmpKey == "" {
		fmpKey = os.Getenv("NEXT_PUBLIC_FMP_API_KEY")
	}
	
	supabaseUrl := os.Getenv("SUPABASE_URL")
	if supabaseUrl == "" {
		supabaseUrl = os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	}
	
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if supabaseKey == "" {
		supabaseKey = os.Getenv("SUPABASE_SERVICE_KEY")
	}
	
	if fmpKey == "" || supabaseUrl == "" || supabaseKey == "" {
		log.Println("Missing environment variables:")
		log.Printf("  FMP_API_KEY found: %v\n", fmpKey != "")
		log.Printf("  SUPABASE_URL found: %v\n", supabaseUrl != "")
		log.Printf("  SUPABASE_SERVICE_ROLE_KEY found: %v\n", supabaseKey != "")
		log.Fatal("Please check your .env.local file in the parent directory")
	}

	// Default symbols if none provided
	symbols := []string{"XLF", "XLE", "XLC", "XLP", "XLV", "XLU", "XLRE", "XLI", "XLY", "XLB", "XLK"}

	// Parse cutoff date if provided (format: MM/DD/YYYY or YYYY-MM-DD)
	var cutoffDate time.Time
	var hasCutoff bool
	
	if len(os.Args) > 2 {
		// Check if the last argument is a date
		lastArg := os.Args[len(os.Args)-1]
		
		// Try parsing MM/DD/YYYY format
		parsedDate, err := time.Parse("01/02/2006", lastArg)
		if err != nil {
			// Try parsing YYYY-MM-DD format
			parsedDate, err = time.Parse("2006-01-02", lastArg)
		}
		
		if err == nil {
			cutoffDate = parsedDate
			hasCutoff = true
			log.Printf("Using cutoff date: %s (only data BEFORE this date will be inserted)\n", cutoffDate.Format("2006-01-02"))
			// Remove the date from args and get symbols
			if len(os.Args) > 3 {
				symbols = os.Args[2 : len(os.Args)-1]
			}
		} else {
			// No valid date, treat all as symbols
			symbols = os.Args[2:]
		}
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

		// Filter quotes by cutoff date if provided
		var filteredQuotes []Quote
		if hasCutoff {
			for _, quote := range quotes {
				quoteDate, err := time.Parse("2006-01-02", quote.Date)
				if err != nil {
					continue
				}
				// Only include quotes BEFORE the cutoff date
				if quoteDate.Before(cutoffDate) {
					filteredQuotes = append(filteredQuotes, quote)
				}
			}
			fmt.Printf("Filtered to %d quotes before %s. ", len(filteredQuotes), cutoffDate.Format("2006-01-02"))
		} else {
			filteredQuotes = quotes
		}

		// Insert all filtered historical quotes
		for i, quote := range filteredQuotes {
			fmt.Printf("\rInserting quote %d/%d for %s (%s)...", i+1, len(filteredQuotes), symbol, quote.Date)

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
