import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { electrolize } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Resources | Finance Guy",
  description: "Curated collection of premium investment resources and tools to enhance your trading strategy.",
};

const resources = [
  {
    title: "Investors.com",
    description: "Access to IBD's premium stock lists, investing tools, stock research, education, and analysis features.",
    link: "https://www.investors.com/",
    features: [
      "Market analysis and stock research",
      "Educational resources for investors",
      "Premium stock screening tools",
      "Real-time market insights"
    ]
  }
];

export default async function ResourcesPage() {
  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="text-center mb-8">
        <h1 className={cn("text-4xl font-semibold mb-4", electrolize.className)}>
          Investment Resources
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Curated collection of premium investment resources and tools to enhance your trading strategy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => (
          <Card key={resource.title} className="group hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{resource.title}</span>
                <ArrowTopRightOnSquareIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardTitle>
              <CardDescription className="text-base">
                {resource.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4">
                {resource.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              <a
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "h-10 px-4 py-2 w-full",
                  electrolize.className
                )}
              >
                Visit Website
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
