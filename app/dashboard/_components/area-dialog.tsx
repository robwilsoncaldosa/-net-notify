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
import { Area } from "../page";
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

interface AreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: Area | null;
  onSave: (area: Partial<Area>) => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Area name is required"),
});

export function AreaDialog({
  open,
  onOpenChange,
  area,
  onSave,
}: AreaDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (area) {
      try {
        const resetData = {
          name: area.name,
        };
        setTimeout(() => {
          form.reset(resetData);
        }, 0);
      } catch (error) {
        // Error handling
      }
    } else {
      form.reset({
        name: "",
      });
    }
  }, [area]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const formattedData = {
        ...values,
      };
      
      onSave(formattedData);
    } catch (error) {
      // Error handling
    }
  }

  const AreaForm = ({ className }: { className?: string }) => {
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
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Area Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter area name"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Name of the service area</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full">
              {area ? "Update Area" : "Add Area"}
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
              {area ? "Edit Area" : "Add Area"}
            </DialogTitle>
          </DialogHeader>
          <AreaForm />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>
            {area ? "Edit Area" : "Add Area"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 overflow-y-auto max-h-[calc(80vh-10rem)]">
          <AreaForm />
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