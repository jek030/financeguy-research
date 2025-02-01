import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { electrolize } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const canslimData = [
  {
    letter: "C",
    title: "Current Quarterly Earnings",
    description: "Strong current quarterly earnings per share",
    details: [
      "Earnings should be up at least 25% in the most recent quarter",
      "Earnings growth should be accelerating in recent quarters",
      "Look for companies showing strong earnings momentum",
      "Compare against same quarter previous year to account for seasonality"
    ]
  },
  {
    letter: "A",
    title: "Annual Earnings Growth",
    description: "Strong annual earnings growth",
    details: [
      "Annual earnings should be up 25% or more in each of the last 3 years",
      "Return on equity should be 17% or higher",
      "Look for stable and consistent growth over time",
      "Higher growth rates indicate stronger potential performance"
    ]
  },
  {
    letter: "N",
    title: "New Products, Management, Price Highs",
    description: "Something new driving growth",
    details: [
      "Look for new products, services, or markets",
      "New management or business practices can drive growth",
      "New industry conditions or economic factors",
      "New price highs often indicate strong momentum"
    ]
  },
  {
    letter: "S",
    title: "Supply and Demand",
    description: "Shares outstanding and volume",
    details: [
      "Look for signs of institutional accumulation",
      "Higher volume on up days vs down days",
      "Fewer shares outstanding is better (under 25M ideal)",
      "Large institutions need weeks to build positions"
    ]
  },
  {
    letter: "L",
    title: "Leader or Laggard",
    description: "Buy market leaders, avoid laggards",
    details: [
      "Stock should be in top 1 or 2 of its industry group",
      "Relative strength rating of 80 or higher",
      "Strong institutional sponsorship but not over-owned",
      "Avoid sympathy plays and lagging stocks"
    ]
  },
  {
    letter: "I",
    title: "Institutional Sponsorship",
    description: "Professional support",
    details: [
      "Look for increasing institutional ownership",
      "Several institutional sponsors with good performance",
      "Avoid over-owned stocks",
      "Better quality institutions are preferred"
    ]
  },
  {
    letter: "M",
    title: "Market Direction",
    description: "Market direction determines success",
    details: [
      "75% of stocks follow market direction",
      "Identify market tops and bottoms",
      "Use market averages to confirm trends",
      "Preserve capital in bear markets"
    ]
  }
];

export default function CanslimPage() {
  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="text-center mb-8">
        <h1 className={cn("text-4xl font-semibold mb-4", electrolize.className)}>
          CANSLIM Methodology
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          William J. O'Neil's proven strategy for identifying high-potential growth stocks. 
          Each letter represents a key characteristic to look for in potential investments.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canslimData.map((item) => (
              <Card key={item.letter} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">{item.letter}</span>
                    <span className="text-lg">{item.title}</span>
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {item.details[0]}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="mt-6">
          <div className="space-y-6">
            {canslimData.map((item) => (
              <Card key={item.letter}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-primary">{item.letter}</span>
                    <span className="text-xl">{item.title}</span>
                  </CardTitle>
                  <CardDescription className="text-lg">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2">
                    {item.details.map((detail, index) => (
                      <li key={index} className="text-muted-foreground">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
