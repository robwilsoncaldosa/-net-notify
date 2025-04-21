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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
  } from "@/components/ui/command";
  import { Check, ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Area, Customer, Plan } from "../page";
import { useState, useEffect, useRef } from "react";
import { PhoneInput } from "@/components/ui/phone-input";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";

// Update the props interface
interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSave: (customer: Partial<Customer>) => void;
  plans: Plan[];
  areas: Area[];
}

// Update the form schema to match the expected field names
  const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone_number: z.string()
      .min(10, "Valid phone number is required"),
      // Remove the transform here
    plan: z.coerce.number().min(1, "Plan is required"),
    area: z.coerce.number().min(1, "Area is required"),
    due_date: z.coerce.date(),
    payment_status: z.enum(["paid", "unpaid", "overdue"]),
    account_status: z.enum(["active", "suspended"]),
  });

export function CustomerDialog({
  open,
  onOpenChange,
  customer,
  onSave,
  plans,
  areas,
}: CustomerDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // Add this to preserve form values between renders
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with customer data if available, otherwise use defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: customer ? {
      name: customer.name || "",
      phone_number: customer.phone_number || "",
    //   @ts-expect-error will fix this later
      plan: customer.plan?.id || undefined as any,
    //   @ts-expect-error will fix this later
      area: customer.area?.id || undefined as any,
      due_date: customer.due_date ? new Date(customer.due_date) : new Date(),
      payment_status: customer.payment_status || "unpaid",
      account_status: customer.account_status || "active",
    } : {
      name: "",
      phone_number: "",
      plan: undefined as any,
      area: undefined as any,
      due_date: new Date(),
      payment_status: "unpaid" as const,
      account_status: "active" as const,
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    if (open) {
      if (customer) {
        form.reset({
          name: customer.name || "",
          phone_number: customer.phone_number || "",
    //   @ts-expect-error will fix this later
          plan: customer.plan?.id || undefined as any,
    //   @ts-expect-error will fix this later
          area: customer.area?.id || undefined as any,
          due_date: customer.due_date ? new Date(customer.due_date) : new Date(),
          payment_status: customer.payment_status || "unpaid",
          account_status: customer.account_status || "active",
        });
      } else {
        form.reset({
          name: "",
          phone_number: "",
          plan: undefined as any,
          area: undefined as any,
          due_date: new Date(),
          payment_status: "unpaid" as const,
          account_status: "active" as const,
        });
      }
    }
  }, [customer, form, open]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      // Handle all transformations here
      const formattedData = {
        ...values,
        phone_number: values.phone_number.startsWith('+') 
          ? values.phone_number 
          : `+${values.phone_number}`,
        due_date: values.due_date,
      };
      
      onSave({
        ...formattedData,
    //   @ts-expect-error will fix this later
        due_date: formattedData.due_date,
        plan: Number(values.plan),
        area: Number(values.area)
      });
    } catch (error) {
      // Error handling remains the same
    } finally {
      setIsSubmitting(false);
    }
  }

  const CustomerForm = ({ className }: { className?: string }) => {
    // Add refs for inputs to maintain focus
    const nameInputRef = useRef<HTMLInputElement>(null);
    const phoneInputRef = useRef<HTMLInputElement>(null);
    
    return (
      <>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              onSubmit(data);
            })}
            className={cn("space-y-6", className)}
          >
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter customer's full name"
                          {...field}
                          ref={nameInputRef}
                          onChange={(e) => {
                            field.onChange(e);
                            // Restore focus after value change
                            if (nameInputRef.current) {
                              const value = e.target.value;
                              const cursorPosition = e.target.selectionStart;
                              // Use setTimeout to ensure the focus is maintained after React's updates
                              setTimeout(() => {
                                if (nameInputRef.current) {
                                  nameInputRef.current.focus();
                                  nameInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                                }
                              }, 0);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>Customer's complete name</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
    
              <div className="col-span-12 md:col-span-6">
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput
                          placeholder="Enter mobile number"
                          {...field}
                          defaultCountry="PH"
                          className="w-full"
    //   @ts-expect-error will fix this later\
                          ref={phoneInputRef}
                          onChange={(e) => {
                            field.onChange(e);
                            // Restore focus after value change
                            if (phoneInputRef.current) {
                              const input = phoneInputRef.current.querySelector('input');
                              if (input) {
                                const cursorPosition = input.selectionStart;
                                // Use setTimeout to ensure the focus is maintained after React's updates
                                setTimeout(() => {
                                  if (input) {
                                    input.focus();
                                    input.setSelectionRange(cursorPosition, cursorPosition);
                                  }
                                }, 0);
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>Customer's contact number</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Plan field with Combobox */}
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Internet Plan</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? plans.find(
                                (plan) => plan.id === field.value
                              )?.label
                            : "Select the plan"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search plan..." />
                        <CommandList>
                          <CommandEmpty>No plan found.</CommandEmpty>
                          <CommandGroup>
                            {plans.map((plan) => (
                              <CommandItem
                                value={plan.label}
                                key={plan.id}
                                onSelect={() => {
                                  form.setValue("plan", plan.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    plan.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {plan.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select the plan subscribed by this customer
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Area field with Combobox */}
            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Area</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? areas.find(
                                (area) => area.id === field.value
                              )?.name
                            : "Select the area"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search area..." />
                        <CommandList>
                          <CommandEmpty>No area found.</CommandEmpty>
                          <CommandGroup>
                            {areas.map((area) => (
                              <CommandItem
                                value={area.name}
                                key={area.id}
                                onSelect={() => {
                                  form.setValue("area", area.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    area.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {area.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Select the customer's area</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Provide due date of customer
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FormField
                  control={form.control}
                  name="payment_status"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Payment Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Current payment status</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="account_status"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Account Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          Active
                        </div>
                      </SelectItem>
                      <SelectItem value="suspended">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          Suspended
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Set the customer's account status
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full">
              {customer ? "Update Customer" : "Add Customer"}
            </Button>
          </form>
        </Form>
        {/* Remove DevTool component */}
      </>
    );
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {customer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>
            {customer ? "Edit Customer" : "Add Customer"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 overflow-y-auto max-h-[calc(80vh-10rem)]">
          <CustomerForm />
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
