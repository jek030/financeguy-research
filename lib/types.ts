/** FMP Company Profile types*/
export interface CompanyProfile {
    symbol: string;
    price: number;
    beta: number;
    volAvg: number;
    mktCap: number;
    lastDiv: number;
    range: string;
    changes: number;
    companyName: string;
    currency: string;
    cik: string;
    isin: string;
    cusip: string;
    exchange: string;
    exchangeShortName: string;
    industry: string;
    website: string;
    description: string;
    ceo: string;
    sector: string;
    country: string;
    fullTimeEmployees: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    dcfDiff: number;
    dcf: number;
    image: string;
    ipoDate: string;
    defaultImage: boolean;
    isEtf: boolean;
    isActivelyTrading: boolean;
    isAdr: boolean;
    isFund: boolean;
  }

  export interface CompanyOutlook {
    profile: CompanyProfile;
    metrics: CompanyMetrics;
    ratios: FinancialRatio[];
    keyExecutives: KeyExecutive[];
    splitsHistory: StockSplit[];
    stockDividend: StockDividend[];
    stockNews: NewsItem[];
    rating: Rating[];
    financialsAnnual: {
      income: IncomeStatement[];
    };
    financialsQuarter: {
      income: IncomeStatement[];
    };
  }

  export interface CompanyMetrics {
    dividendYielTTM: number;
    volume: number;
    yearHigh: number;
    yearLow: number;
  }
  
  export interface FinancialRatio {
    dividendYielTTM: number;
    dividendYielPercentageTTM: number;
    peRatioTTM: number;
    pegRatioTTM: number;
    payoutRatioTTM: number;
    currentRatioTTM: number;
    quickRatioTTM: number;
    cashRatioTTM: number;
    daysOfSalesOutstandingTTM: number;
    daysOfInventoryOutstandingTTM: number;
    operatingCycleTTM: number;
    daysOfPayablesOutstandingTTM: number;
    cashConversionCycleTTM: number;
    grossProfitMarginTTM: number;
    operatingProfitMarginTTM: number;
    pretaxProfitMarginTTM: number;
    netProfitMarginTTM: number;
    effectiveTaxRateTTM: number;
    returnOnAssetsTTM: number;
    returnOnEquityTTM: number;
    returnOnCapitalEmployedTTM: number;
    netIncomePerEBTTTM: number;
    ebtPerEbitTTM: number;
    ebitPerRevenueTTM: number;
    debtRatioTTM: number;
    debtEquityRatioTTM: number;
    longTermDebtToCapitalizationTTM: number;
    totalDebtToCapitalizationTTM: number;
    interestCoverageTTM: number;
    cashFlowToDebtRatioTTM: number;
    companyEquityMultiplierTTM: number;
    receivablesTurnoverTTM: number;
    payablesTurnoverTTM: number;
    inventoryTurnoverTTM: number;
    fixedAssetTurnoverTTM: number;
    assetTurnoverTTM: number;
    operatingCashFlowPerShareTTM: number;
    freeCashFlowPerShareTTM: number;
    cashPerShareTTM: number;
    operatingCashFlowSalesRatioTTM: number;
    freeCashFlowOperatingCashFlowRatioTTM: number;
    cashFlowCoverageRatiosTTM: number;
    shortTermCoverageRatiosTTM: number;
    capitalExpenditureCoverageRatioTTM: number;
    dividendPaidAndCapexCoverageRatioTTM: number;
    priceBookValueRatioTTM: number;
    priceToBookRatioTTM: number;
    priceToSalesRatioTTM: number;
    priceEarningsRatioTTM: number;
    priceToFreeCashFlowsRatioTTM: number;
    priceToOperatingCashFlowsRatioTTM: number;
    priceCashFlowRatioTTM: number;
    priceEarningsToGrowthRatioTTM: number;
    priceSalesRatioTTM: number;
    dividendPerShareTTM: number;
  }
  
  export interface InsiderTrade {
    symbol: string;
    filingDate: string;
    transactionDate: string;
    reportingCik: string;
    transactionType: string;
    securitiesOwned: number;
    companyCik: string;
    reportingName: string;
    typeOfOwner: string;
    acquistionOrDisposition: string;
    formType: string;
    securitiesTransacted: number;
    price: number;
    securityName: string;
    link: string;
    officerTitle: string;
  }
  
  export interface KeyExecutive {
    title: string;
    name: string;
    pay: number;
    currencyPay: string;
    gender: string;
    yearBorn: number;
    titleSince: number;
  }
  
  export interface StockSplit {
    date: string;
    label: string;
    numerator: number;
    denominator: number;
  }
  
  export interface StockDividend {
    date: string;
    label: string;
    adjDividend: number;
    dividend: number;
    recordDate: string;
    paymentDate: string;
    declarationDate: string;
  }
  
  export interface NewsItem {
    symbol: string;
    publishedDate: string;
    title: string;
    image: string;
    site: string;
    text: string;
    url: string;
  }
  
  export interface Rating {
    symbol: string;
    date: string;
    rating: string;
    ratingScore: number;
    ratingRecommendation: string;
    ratingDetailsDCFScore: number;
    ratingDetailsDCFRecommendation: string;
    ratingDetailsROEScore: number;
    ratingDetailsROERecommendation: string;
    ratingDetailsROAScore: number;
    ratingDetailsROARecommendation: string;
    ratingDetailsDEScore: number;
    ratingDetailsDERecommendation: string;
    ratingDetailsPEScore: number;
    ratingDetailsPERecommendation: string;
    ratingDetailsPBScore: number;
    ratingDetailsPBRecommendation: string;
  }
  
  export interface IncomeStatement {
    date: string;
    symbol: string;
    reportedCurrency: string;
    cik: string;
    fillingDate: string;
    acceptedDate: string;
    calendarYear: string;
    period: string;
    revenue: number;
    costOfRevenue: number;
    grossProfit: number;
    grossProfitRatio: number;
    researchAndDevelopmentExpenses: number;
    generalAndAdministrativeExpenses: number;
    sellingAndMarketingExpenses: number;
    sellingGeneralAndAdministrativeExpenses: number;
    otherExpenses: number;
    operatingExpenses: number;
    costAndExpenses: number;
    interestIncome: number;
    interestExpense: number;
    depreciationAndAmortization: number;
    ebitda: number;
    ebitdaratio: number;
    operatingIncome: number;
    operatingIncomeRatio: number;
    totalOtherIncomeExpensesNet: number;
    incomeBeforeTax: number;
    incomeBeforeTaxRatio: number;
    incomeTaxExpense: number;
    netIncome: number;
    netIncomeRatio: number;
    eps: number;
    epsdiluted: number;
    weightedAverageShsOut: number;
    weightedAverageShsOutDil: number;
    link: string;
    finalLink: string;
  }
  
  export interface KeyMetrics {
    // Financial Metrics
    revenuePerShare: number;
    netIncomePerShare: number;
    operatingCashFlowPerShare: number;
    freeCashFlowPerShare: number;
    cashPerShare: number;
    bookValuePerShare: number;
    tangibleBookValuePerShare: number;
    shareholdersEquityPerShare: number;
    interestDebtPerShare: number;
    marketCap: number;
    enterpriseValue: number;
    peRatio: number;
    priceToSalesRatio: number;
    pocfratio: number;
    pfcfRatio: number;
    pbRatio: number;
    ptbRatio: number;
    evToSales: number;
    enterpriseValueOverEBITDA: number;
    evToOperatingCashFlow: number;
    evToFreeCashFlow: number;
    earningsYield: number;
    freeCashFlowYield: number;
    debtToEquity: number;
    debtToAssets: number;
    netDebtToEBITDA: number;
    currentRatio: number;
    interestCoverage: number;
    incomeQuality: number;
    dividendYield: number;
    payoutRatio: number;
    salesGeneralAndAdministrativeToRevenue: number;
    researchAndDevelopementToRevenue: number;
    intangiblesToTotalAssets: number;
    capexToOperatingCashFlow: number;
    capexToRevenue: number;
    capexToDepreciation: number;
    stockBasedCompensationToRevenue: number;
    grahamNumber: number;
    roic: number;
    returnOnTangibleAssets: number;
    grahamNetNet: number;
    workingCapital: number;
    tangibleAssetValue: number;
    netCurrentAssetValue: number;
    investedCapital: number;
    averageReceivables: number;
    averagePayables: number;
    averageInventory: number;
    daysSalesOutstanding: number;
    daysPayablesOutstanding: number;
    daysOfInventoryOnHand: number;
    receivablesTurnover: number;
    payablesTurnover: number;
    inventoryTurnover: number;
    roe: number;
    capexPerShare: number;
  
    // TTM Specific Fields
    revenuePerShareTTM?: number;
    netIncomePerShareTTM?: number;
    operatingCashFlowPerShareTTM?: number;
    freeCashFlowPerShareTTM?: number;
    cashPerShareTTM?: number;
    bookValuePerShareTTM?: number;
    tangibleBookValuePerShareTTM?: number;
    shareholdersEquityPerShareTTM?: number;
    interestDebtPerShareTTM?: number;
    marketCapTTM?: number;
    enterpriseValueTTM?: number;
    peRatioTTM?: number;
    priceToSalesRatioTTM?: number;
    pocfratioTTM?: number;
    pfcfRatioTTM?: number;
    pbRatioTTM?: number;
    ptbRatioTTM?: number;
    evToSalesTTM?: number;
    enterpriseValueOverEBITDATTM?: number;
    evToOperatingCashFlowTTM?: number;
    evToFreeCashFlowTTM?: number;
    earningsYieldTTM?: number;
    freeCashFlowYieldTTM?: number;
    debtToEquityTTM?: number;
    debtToAssetsTTM?: number;
    netDebtToEBITDATTM?: number;
    currentRatioTTM?: number;
    interestCoverageTTM?: number;
    incomeQualityTTM?: number;
    dividendYieldTTM?: number;
    dividendYieldPercentageTTM?: number;
    payoutRatioTTM?: number;
    salesGeneralAndAdministrativeToRevenueTTM?: number;
    researchAndDevelopementToRevenueTTM?: number;
    intangiblesToTotalAssetsTTM?: number;
    capexToOperatingCashFlowTTM?: number;
    capexToRevenueTTM?: number;
    capexToDepreciationTTM?: number;
    stockBasedCompensationToRevenueTTM?: number;
    grahamNumberTTM?: number;
    roicTTM?: number;
    returnOnTangibleAssetsTTM?: number;
    grahamNetNetTTM?: number;
    workingCapitalTTM?: number;
    tangibleAssetValueTTM?: number;
    netCurrentAssetValueTTM?: number;
    investedCapitalTTM?: number;
    averageReceivablesTTM?: number;
    averagePayablesTTM?: number;
    averageInventoryTTM?: number;
    daysSalesOutstandingTTM?: number;
    daysPayablesOutstandingTTM?: number;
    daysOfInventoryOnHandTTM?: number;
    receivablesTurnoverTTM?: number;
    payablesTurnoverTTM?: number;
    inventoryTurnoverTTM?: number;
    roeTTM?: number;
    capexPerShareTTM?: number;
    dividendPerShareTTM?: number;
    debtToMarketCapTTM?: number;
  
    // Metadata
    date: string;
    period: string;
    symbol: string;
    calendarYear: string;
  }
  /** end FMP Company Profile types*/


  export interface PriceHistory {
    key: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    datetime: string;
    change: string;
}

export interface Ticker {
    symbol: string;
    name: string;
    price: number;
    changesPercentage: number;
    change: number;
    dayLow: number;
    dayHigh: number;
    yearHigh: number;
    yearLow: number;
    marketCap: number;
    priceAvg50: number;
    priceAvg200: number;
    exchange: string;
    volume: number;
    avgVolume: number;
    open: number;
    previousClose: number;
    eps: number;
    pe: number;
    earningsAnnouncement: string;
    sharesOutstanding: number;
    timestamp: number;
}

export interface EarningsCalendar {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;
  revenue: number | null;
  revenueEstimated: number | null;
  updatedFromDate: string;
  fiscalDateEnding: string;
}

// Sector types for the sectors table
export interface Sector {
  id: string;
  created_at: string;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
}