"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/phone-input";
import { Input } from "@/components/ui/input";
import {
  MultiSelector,
  MultiSelectorContent,
  MultiSelectorInput,
  MultiSelectorItem,
  MultiSelectorList,
  MultiSelectorTrigger
} from "@/components/ui/multi-select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, InfoIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/utils/supabase/client";
import { sendSMS } from "@/utils/send-sms";


type Customer = {
    id: number;
    name: string;
    phone_number: string;
    due_date: string;
    plan: string;
    payment_status: string;
    account_status: string;
  };
  
  type Recipient = {
    name: string;
    phoneNumber: string;
    dueDate: Date;
    isFromDB?: boolean;
  };
// Separate form schema for recipient section
const recipientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().refine((value) => {
    return /^\+63\d{10}$/.test(value);
  }, "Invalid Philippine phone number"),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
});

// Separate form schema for messaging section
const messageFormSchema = z.object({
  selectedRecipients: z.array(z.string()).min(1, "Select at least one recipient"),
  message: z.string().min(1, "Message is required"),
  useDefaultMessage: z.boolean().default(false),
  messageTemplate: z.string().optional(),
});

const TEMPLATE_VARIABLES = [
  { name: "{{name}}", description: "Recipient's name" },
  { name: "{{dueDate}}", description: "Formatted due date (e.g., January 1, 2025)" },
  { name: "{{dueDateShort}}", description: "Short due date format (e.g., Jan 1, 2025)" },
  { name: "{{reminderDate}}", description: "Date 3 days before due date" },
  { name: "{{phoneNumber}}", description: "Recipient's phone number" },
  { name: "{{daysToDue}}", description: "Number of days until due date" },
];

const DEFAULT_TEMPLATE = "Hi {{name}}, your internet bill payment is due on {{dueDate}}. Kindly settle your balance before the due date to avoid service interruption. Thank you!";




export default function MyForm() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [nameToRecipientMap, setNameToRecipientMap] = useState<Record<string, Recipient>>({});
  const [useDefaultMessage, setUseDefaultMessage] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch customers from database on component mount
  useEffect(() => {
    async function fetchCustomers() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('customer')
          .select('*');
        
        if (error) {
          throw error;
        }
        
        if (data) {
          const fetchedRecipients: Recipient[] = data.map((customer: Customer) => ({
            name: customer.name,
            phoneNumber: customer.phone_number,
            dueDate: new Date(customer.due_date),
            isFromDB: true
          }));
          
          setRecipients(fetchedRecipients);
          
          // Create name to recipient mapping
          const recipientMap: Record<string, Recipient> = {};
          fetchedRecipients.forEach(recipient => {
            recipientMap[recipient.name] = recipient;
          });
          
          setNameToRecipientMap(recipientMap);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error('Failed to load customers');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCustomers();
  }, []);
  // Separate form for recipient management
  const recipientForm = useForm<z.infer<typeof recipientFormSchema>>({
    resolver: zodResolver(recipientFormSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
    },
  });

  // Separate form for messaging
  const messageForm = useForm<z.infer<typeof messageFormSchema>>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      selectedRecipients: [],
      message: "",
      useDefaultMessage: false,
      messageTemplate: DEFAULT_TEMPLATE,
    },
  });

  const useDefaultMessageValue = messageForm.watch("useDefaultMessage");
  const messageTemplateValue = messageForm.watch("messageTemplate");
  const selectedRecipientsValue = messageForm.watch("selectedRecipients");

  const handleAddRecipient = async () => {
    const isValid = await recipientForm.trigger();
    
    if (!isValid) {
      return;
    }
    
    const name = recipientForm.getValues("name");
    const phoneNumber = recipientForm.getValues("phoneNumber");
    const dueDate = recipientForm.getValues("dueDate");
    
    if (recipients.some(r => r.phoneNumber === phoneNumber)) {
      toast.error("This phone number has already been added");
      return;
    }

    if (name && phoneNumber && dueDate) {
      const newRecipient: Recipient = { 
        name, 
        phoneNumber, 
        dueDate,
        isFromDB: false // Mark as temporary recipient
      };
      
      setRecipients(prev => [...prev, newRecipient]);
      setNameToRecipientMap(prev => ({ ...prev, [name]: newRecipient }));
      
      const currentSelectedRecipients = messageForm.getValues("selectedRecipients");
      messageForm.setValue("selectedRecipients", [...currentSelectedRecipients, name]);
      
      // Reset recipient form fields
      recipientForm.reset({
        name: "",
        phoneNumber: "",
        dueDate: undefined,
      });
      
      toast.success(`Added ${name} to recipients (temporary)`);
    }
  };

  const processTemplate = (template: string, recipient: Recipient): string => {
    const dueDate = recipient.dueDate;
    const reminderDate = addDays(dueDate, -3);
    const daysToDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return template
      .replace(/{{name}}/g, recipient.name)
      .replace(/{{dueDate}}/g, format(dueDate, "MMMM d, yyyy"))
      .replace(/{{dueDateShort}}/g, format(dueDate, "MMM d, yyyy"))
      .replace(/{{reminderDate}}/g, format(reminderDate, "MMMM d, yyyy"))
      .replace(/{{phoneNumber}}/g, recipient.phoneNumber)
      .replace(/{{daysToDue}}/g, daysToDue.toString());
  };

  useEffect(() => {
    if (useDefaultMessageValue && selectedRecipientsValue.length > 0 && messageTemplateValue) {
      const firstRecipient = nameToRecipientMap[selectedRecipientsValue[0]];
      if (firstRecipient) {
        const processed = processTemplate(messageTemplateValue, firstRecipient);
        setPreviewMessage(processed);
        messageForm.setValue("message", processed);
      }
    } else if (!useDefaultMessageValue) {
      setPreviewMessage("");
    }
  }, [useDefaultMessageValue, messageTemplateValue, selectedRecipientsValue, nameToRecipientMap]);

  useEffect(() => {
    setUseDefaultMessage(useDefaultMessageValue);
  }, [useDefaultMessageValue]);

  const insertTemplateVariable = (variable: string) => {
    const templateField = messageForm.getValues("messageTemplate") || "";
    messageForm.setValue("messageTemplate", templateField + variable);
  };

  async function onSubmit(values: z.infer<typeof messageFormSchema>) {
    try {
      if (values.selectedRecipients.length === 0) {
        toast.error("Please select at least one recipient");
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading("Sending messages...");

      if (values.useDefaultMessage) {
        if (!values.messageTemplate) {
          toast.error("Please enter a message template", { id: loadingToast });
          return;
        }
        
        // Process all messages in parallel
        const sendPromises = values.selectedRecipients.map(async (name) => {
          const recipient = nameToRecipientMap[name];
          if (recipient && values.messageTemplate) {
            const personalizedMessage = processTemplate(values.messageTemplate, recipient);
            return sendSMS([recipient.phoneNumber], personalizedMessage);
          }
        });
        
        await Promise.all(sendPromises.filter(Boolean));
      } else {
        if (!values.message) {
          toast.error("Please enter a message", { id: loadingToast });
          return;
        }
        
        const phoneNumbers = values.selectedRecipients
          .map(name => nameToRecipientMap[name]?.phoneNumber)
          .filter(phone => !!phone) as string[];

        if (phoneNumbers.length > 0) {
          await sendSMS(phoneNumbers, values.message);
        }
      }

      toast.success("Messages sent successfully!", { id: loadingToast });
    } catch (error) {
      console.error("Form submission error", error);
      toast.error(typeof error === 'object' && error instanceof Error ? error.message : "Failed to send messages. Please try again.");
    }
  }

  return (
    <>
    <div className="mx-auto py-10 pt-5 space-y-10">
      {/* Recipient Management Section */}
      <div className="p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Add Temporary Recipient</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add recipients that aren't in your customer database. These will only be available for this session.
        </p>
        <Form {...recipientForm}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={recipientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={recipientForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <PhoneInput
                        placeholder="+63 912 345 6789"
                        autoComplete="off"
                        {...field}
                        defaultCountry="PH"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a valid Philippine mobile number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={recipientForm.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Due Date</FormLabel>
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
                            <span>Select when payment is due</span>
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
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select the date when internet bill payment is due
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="button" 
              onClick={handleAddRecipient}
              className="w-full md:w-auto"
            >
              Add This Recipient
            </Button>
          </div>
        </Form>
      </div>

      {/* <Separator className="my-8" /> */}

    </div>
    <div className="mx-auto py-10 pt-5 space-y-10">

     {/* Message Sending Section */}
     <div className="p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Send SMS Messages</h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Form {...messageForm}>
            <form
              onSubmit={messageForm.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <FormField
                control={messageForm.control}
                name="selectedRecipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Recipients</FormLabel>
                    <FormControl>
                      <MultiSelector
                        values={field.value}
                        onValuesChange={field.onChange}
                        loop
                        className="w-full"
                      >
                        <MultiSelectorTrigger>
                          <MultiSelectorInput placeholder="Choose one or more recipients" />
                        </MultiSelectorTrigger>
                        <MultiSelectorContent>
                          <MultiSelectorList>
                            {recipients.map((recipient) => {
                              const dueDateString = format(recipient.dueDate, "MMM d, yyyy");
                              return (
                                <MultiSelectorItem
                                  key={recipient.phoneNumber}
                                  value={recipient.name}
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center">
                                      <span className="font-medium">{recipient.name}</span>
                                      {!recipient.isFromDB && (
                                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                                          Temporary
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {recipient.phoneNumber} | Due: {dueDateString}
                                    </span>
                                  </div>
                                </MultiSelectorItem>
                              );
                            })}
                          </MultiSelectorList>
                        </MultiSelectorContent>
                      </MultiSelector>
                    </FormControl>
                    <FormDescription>
                      Select one or more recipients for your message
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div className="rounded-md">
              <FormField
                control={messageForm.control}
                name="useDefaultMessage"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Use Personalized Template</FormLabel>
                      <FormDescription>
                        Create a template with variables that will be customized for each recipient
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {useDefaultMessage && (
              <div className="space-y-4">
                <FormField
                  control={messageForm.control}
                  name="messageTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-base">Message Template</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <InfoIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="w-80">
                              <p className="font-medium">Available Variables:</p>
                              <ul className="text-sm list-disc pl-5 mt-1">
                                {TEMPLATE_VARIABLES.map((variable) => (
                                  <li key={variable.name}>
                                    <span className="font-mono text-xs">{variable.name}</span>: {variable.description}
                                  </li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Textarea
                          className="font-mono min-h-24"
                          placeholder="Enter your message with variables like {{name}} and {{dueDate}}"
                          {...field}
                        />
                      </FormControl>
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Insert variable:</p>
                        <div className="flex flex-wrap gap-2">
                          {TEMPLATE_VARIABLES.map((variable) => (
                            <Button
                              key={variable.name}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => insertTemplateVariable(variable.name)}
                              className="text-xs"
                            >
                              {variable.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedRecipientsValue.length > 0 && messageTemplateValue && (
                  <div className="rounded-md  p-4 bg-muted/20">
                    <h4 className="text-sm font-medium mb-2">Message Preview:</h4>
                    <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
                    <p className="text-xs mt-2 text-muted-foreground">
                      This is how the message will appear for {selectedRecipientsValue[0]}
                    </p>
                  </div>
                )}
              </div>
            )}

            <FormField
              control={messageForm.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={useDefaultMessage ? 
                        "Message content will be generated from template" : 
                        "Type your message here..."
                      }
                      {...field}
                      disabled={useDefaultMessage}
                      className="min-h-28"
                    />
                  </FormControl>
                  <FormDescription>
                    {useDefaultMessage ?
                      "A personalized message will be created for each recipient based on the template" :
                      "This exact message will be sent to all selected recipients"
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit"
              className="w-full md:w-auto" 
              disabled={recipients.length === 0}
            >
              Send Messages
            </Button>
          </form>
        </Form>
      )}
      </div>
    </div>
    </>
    
  );
}