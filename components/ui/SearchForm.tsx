"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Search as SearchIcon } from 'lucide-react';
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";

const FormSchema = z.object({
  symbol: z.string().min(1, {
    message: "Symbol must be at least 1 character.",
  }),
});

interface SearchFormProps {
  className?: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ className = "" }) => {
  const router = useRouter();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      symbol: "",
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    router.push(`/search/${data.symbol.toUpperCase()}`);
  }

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className={`w-full ${className}`}
      >
        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <div className="flex gap-1">
                <FormControl>
                  <Input 
                    placeholder="Search for a symbol" 
                    className="flex-1 h-8 bg-background border-border rounded-l-md rounded-r-none focus-visible:ring-0 focus-visible:border-border text-sm"
                    autoComplete="off"
                    {...field} 
                  />
                </FormControl>
                <Button 
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 rounded-l-none rounded-r-md"
                >
                  <SearchIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default SearchForm; 