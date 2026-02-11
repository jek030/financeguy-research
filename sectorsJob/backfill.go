package main

import (
	"fmt"
	"log"
	"os"
	"time"
)

// parseDate attempts to parse a string as MM/DD/2006 or 2006-01-02
func parseDate(s string) (time.Time, bool) {
	if d, err := time.Parse("01/02/2006", s); err == nil {
		return d, true
	}
	if d, err := time.Parse("2006-01-02", s); err == nil {
		return d, true
	}
	return time.Time{}, false
}

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

	// Parse dates and symbols from args (format: MM/DD/YYYY or YYYY-MM-DD)
	var fromDate, toDate time.Time
	var hasFrom, hasTo bool

	if len(os.Args) > 2 {
		var dates []time.Time
		var parsedSymbols []string

		for _, arg := range os.Args[2:] {
			if d, ok := parseDate(arg); ok {
				dates = append(dates, d)
			} else {
				parsedSymbols = append(parsedSymbols, arg)
			}
		}

		if len(parsedSymbols) > 0 {
			symbols = parsedSymbols
		}

		if len(dates) == 2 {
			// Two dates: use as from and to (earlier = from, later = to)
			if dates[0].Before(dates[1]) || dates[0].Equal(dates[1]) {
				fromDate, toDate = dates[0], dates[1]
			} else {
				fromDate, toDate = dates[1], dates[0]
			}
			hasFrom, hasTo = true, true
			log.Printf("Using date range: %s to %s (only data between these dates will be inserted)\n", fromDate.Format("2006-01-02"), toDate.Format("2006-01-02"))
		} else if len(dates) == 1 {
			// One date: treat as "to" (backfill up to and including that date)
			toDate = dates[0]
			hasTo = true
			log.Printf("Using cutoff date: %s (only data up to and including this date will be inserted)\n", toDate.Format("2006-01-02"))
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

		// Filter quotes by date range if provided
		var filteredQuotes []Quote
		if hasFrom || hasTo {
			for _, quote := range quotes {
				quoteDate, err := time.Parse("2006-01-02", quote.Date)
				if err != nil {
					continue
				}
				if hasFrom && quoteDate.Before(fromDate) {
					continue
				}
				if hasTo && quoteDate.After(toDate) {
					continue
				}
				filteredQuotes = append(filteredQuotes, quote)
			}
			if hasFrom && hasTo {
				fmt.Printf("Filtered to %d quotes between %s and %s. ", len(filteredQuotes), fromDate.Format("2006-01-02"), toDate.Format("2006-01-02"))
			} else if hasTo {
				fmt.Printf("Filtered to %d quotes up to %s. ", len(filteredQuotes), toDate.Format("2006-01-02"))
			} else {
				fmt.Printf("Filtered to %d quotes from %s. ", len(filteredQuotes), fromDate.Format("2006-01-02"))
			}
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
