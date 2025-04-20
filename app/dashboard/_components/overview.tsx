"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Define the data structure
interface ChartData {
  month: string;
  customers: number;
}

const chartConfig = {
  customers: {
    label: "Customers",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function Overview() {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trend, setTrend] = useState<{ percentage: number; isUp: boolean }>({ percentage: 0, isUp: true });
  const supabase = createClient();

  useEffect(() => {
    async function fetchCustomerData() {
      setIsLoading(true);
      try {
        // Get the current year
        const currentYear = new Date().getFullYear();
        
        // Fetch customer data grouped by month
        const { data: customersByMonth, error } = await supabase
          .from('customer')
          .select('created_at')
          .gte('created_at', `${currentYear}-01-01`)
          .lte('created_at', `${currentYear}-12-31`);

        if (error) {
          console.error('Error fetching customer data:', error);
          return;
        }

        // Month names for display
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];

        // Initialize monthly counts
        const monthlyData: ChartData[] = monthNames.map(month => ({
          month,
          customers: 0
        }));

        // Count customers by month
        if (customersByMonth) {
          customersByMonth.forEach((customer) => {
            const date = new Date(customer.created_at);
            const month = date.getMonth(); // 0-based index (0 = January)
            monthlyData[month].customers += 1;
          });
        }

        // Calculate trend (current month vs previous month)
        const currentMonth = new Date().getMonth();
        const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        
        const currentMonthValue = monthlyData[currentMonth].customers;
        const previousMonthValue = monthlyData[previousMonth].customers;
        
        let trendPercentage = 0;
        let isTrendUp = true;
        
        if (previousMonthValue > 0) {
          trendPercentage = Math.abs(((currentMonthValue - previousMonthValue) / previousMonthValue) * 100);
          isTrendUp = currentMonthValue >= previousMonthValue;
        }
        
        setTrend({
          percentage: parseFloat(trendPercentage.toFixed(1)),
          isUp: isTrendUp
        });

        // Get only the last 6 months for display
        const lastSixMonths = [];
        for (let i = 5; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12; // Ensure we wrap around correctly
          lastSixMonths.push(monthlyData[monthIndex]);
        }

        setData(lastSixMonths);
      } catch (error) {
        console.error('Error in data processing:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCustomerData();
  }, [supabase]);

  // Get current month and year for the card description
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Growth</CardTitle>
        <CardDescription>{`${currentMonth} ${currentYear}`}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <BarChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="customers" fill="var(--color-customers)" radius={8} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          {trend.isUp ? (
            <>
              Trending up by {trend.percentage}% this month <TrendingUp className="h-4 w-4 text-green-500" />
            </>
          ) : (
            <>
              Trending down by {trend.percentage}% this month <TrendingDown className="h-4 w-4 text-red-500" />
            </>
          )}
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total customers for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}