"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Plan } from "../page";
import { useEffect } from "react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Textarea } from "@/components/ui/textarea";

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
  onSave: (plan: Partial<Plan>) => void;
}

const formSchema = z.object({
  label: z.string().min(1, "Plan name is required"),
  value: z.coerce.number().min(0, "Price must be a positive number"),
});

export function PlanDialog({
  open,
  onOpenChange,
  plan,
  onSave,
}: PlanDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      value: 0,
    },
  });

  useEffect(() => {
    if (plan) {
      try {
        const resetData = {
          label: plan.label,
    //   @ts-expect-error will fix this later
          value: plan.value,
        };
        setTimeout(() => {
          form.reset(resetData);
        }, 0);
      } catch (error) {
        // Error handling
      }
    } else {
      form.reset({
        label: "",
        value: 0,
      });
    }
  }, [plan]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const formattedData = {
        ...values,
        value: Number(values.value),
      };
      
      onSave(formattedData);
    } catch (error) {
      // Error handling
    }
  }

  const PlanForm = ({ className }: { className?: string }) => {
    return (
      <>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              onSubmit(data);
            })}
            className={cn("space-y-6", className)}
          >
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Plan Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter plan name"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Name of the internet plan</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter plan price"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Monthly price of the plan</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
   
            <Button type="submit" className="w-full">
              {plan ? "Update Plan" : "Add Plan"}
            </Button>
          </form>
        </Form>
      </>
    );
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {plan ? "Edit Plan" : "Add Plan"}
            </DialogTitle>
          </DialogHeader>
          <PlanForm />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>
            {plan ? "Edit Plan" : "Add Plan"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 overflow-y-auto max-h-[calc(80vh-10rem)]">
          <PlanForm />
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}