"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/phone-input";
import { Input } from "@/components/ui/input";
import { sendSMS } from "./send-sms";
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

// Define a recipient type with due date
type Recipient = {
  name: string;
  phoneNumber: string;
  dueDate: Date;
};

const formSchema = z.object({
  selectedRecipients: z.array(z.string()),
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().optional().refine((value) => {
    return !value || /^\+63\d{10}$/.test(value);
  }, "Invalid Philippine phone number"),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
  message: z.string().min(1, "Message is required"),
  useDefaultMessage: z.boolean().default(false),
  messageTemplate: z.string().optional(),
});

// Available template variables
const TEMPLATE_VARIABLES = [
  { name: "{{name}}", description: "Recipient's name" },
  { name: "{{dueDate}}", description: "Formatted due date (e.g., January 1, 2025)" },
  { name: "{{dueDateShort}}", description: "Short due date format (e.g., Jan 1, 2025)" },
  { name: "{{reminderDate}}", description: "Date 3 days before due date" },
  { name: "{{phoneNumber}}", description: "Recipient's phone number" },
  { name: "{{daysToDue}}", description: "Number of days until due date" },
];

// Default template message
const DEFAULT_TEMPLATE = "Hi {{name}}, this is a reminder that your internet bill payment is due on {{dueDate}}. Please ensure you make the payment before {{reminderDate}} to avoid service interruption. Thank you!";

export default function MyForm() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  // Map to convert between name and recipient data
  const [nameToRecipientMap, setNameToRecipientMap] = useState<Record<string, Recipient>>({});
  const [useDefaultMessage, setUseDefaultMessage] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedRecipients: [],
      name: "",
      phoneNumber: "",
      message: "",
      useDefaultMessage: false,
      messageTemplate: DEFAULT_TEMPLATE,
    },
  });

  // Watch fields for updates
  const useDefaultMessageValue = form.watch("useDefaultMessage");
  const messageTemplateValue = form.watch("messageTemplate");
  const selectedRecipientsValue = form.watch("selectedRecipients");
  
  const handleAddRecipient = async () => {
    const phoneNumber = form.getValues("phoneNumber");
    const name = form.getValues("name");
    const dueDate = form.getValues("dueDate");
    
    // Trigger validation for the fields
    const isValid = await form.trigger(["phoneNumber", "name", "dueDate"]);

    if (!isValid) {
      toast.error("Please enter valid information");
      return;
    }

    if (phoneNumber && recipients.some(r => r.phoneNumber === phoneNumber)) {
      toast.error("This number has already been added");
      return;
    }

    if (phoneNumber && name && dueDate) {
      const newRecipient: Recipient = { name, phoneNumber, dueDate };
      setRecipients([...recipients, newRecipient]);
      
      // Update our name-to-recipient mapping
      setNameToRecipientMap(prev => ({...prev, [name]: newRecipient}));
      
      // Update the form's selectedRecipients with names
      const currentSelectedRecipients = form.getValues("selectedRecipients");
      form.setValue("selectedRecipients", [...currentSelectedRecipients, name]);
    }
    
    form.resetField("phoneNumber");
    form.resetField("name");
    form.resetField("dueDate");
  };

  // Process template with recipient data
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

  // Update preview message based on template and selected recipient
  useEffect(() => {
    if (useDefaultMessageValue && selectedRecipientsValue.length > 0 && messageTemplateValue) {
      const firstRecipient = nameToRecipientMap[selectedRecipientsValue[0]];
      if (firstRecipient) {
        const processed = processTemplate(messageTemplateValue, firstRecipient);
        setPreviewMessage(processed);
        form.setValue("message", processed);
      }
    } else if (!useDefaultMessageValue) {
      setPreviewMessage("");
    }
  }, [useDefaultMessageValue, messageTemplateValue, selectedRecipientsValue, nameToRecipientMap]);

  // Update useDefaultMessage state when the form value changes
  useEffect(() => {
    setUseDefaultMessage(useDefaultMessageValue);
  }, [useDefaultMessageValue]);

  // Insert template variable at cursor position
  const insertTemplateVariable = (variable: string) => {
    const templateField = form.getValues("messageTemplate") || "";
    form.setValue("messageTemplate", templateField + variable);
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (values.useDefaultMessage) {
        // Send personalized messages to each recipient
        values.selectedRecipients.forEach(name => {
          const recipient = nameToRecipientMap[name];
          if (recipient && values.messageTemplate) {
            const personalizedMessage = processTemplate(values.messageTemplate, recipient);
            sendSMS([recipient.phoneNumber], personalizedMessage);
          }
        });
      } else {
        // Send the same message to all recipients
        const phoneNumbers = values.selectedRecipients
          .map(name => nameToRecipientMap[name]?.phoneNumber)
          .filter(phone => !!phone) as string[];
          
        if (phoneNumbers.length > 0) {
          sendSMS(phoneNumbers, values.message);
        }
      }
      
      toast.success("Messages sent successfully!");
    } catch (error) {
      console.error("Form submission error", error);
      toast.error("Failed to submit the form. Please try again.");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 max-w-3xl mx-auto py-10"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter recipient name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <PhoneInput
                    placeholder="+63 912 345 6789"
                    autoComplete="off"
                    {...field}
                    defaultCountry="PH"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
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
                        <span>Select payment due date</span>
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
                Select the date when the internet bill payment is due
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="button" onClick={handleAddRecipient}>
          Add Recipient
        </Button>

        <FormField
          control={form.control}
          name="selectedRecipients"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipients</FormLabel>
              <FormControl>
                <MultiSelector
                  values={field.value}
                  onValuesChange={field.onChange}
                  loop
                  className="w-full"
                >
                  <MultiSelectorTrigger>
                    <MultiSelectorInput placeholder="Select recipients" />
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
                            {recipient.name} ({recipient.phoneNumber}) - Due: {dueDateString}
                          </MultiSelectorItem>
                        );
                      })}
                    </MultiSelectorList>
                  </MultiSelectorContent>
                </MultiSelector>
              </FormControl>
              <FormDescription>
                Select multiple recipients to send the message to
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
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
              <FormLabel>Use message template</FormLabel>
              <FormDescription>
                Create a customizable template with variables
              </FormDescription>
            </FormItem>
          )}
        />

        {useDefaultMessage && (
          <div className="space-y-4">
            <FormField
              control={form.control}
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
                        <TooltipContent>
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
                      placeholder="Enter your message template with variables"
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
              <div className="rounded-md border p-4 bg-muted/20">
                <h4 className="text-sm font-medium mb-2">Preview:</h4>
                <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
              </div>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={useDefaultMessage ? "Template will be used" : "Write your message"}
                  {...field}
                  disabled={useDefaultMessage}
                  className="min-h-24"
                />
              </FormControl>
              <FormDescription>
                {useDefaultMessage ? 
                  "A personalized message will be generated for each recipient using the template" :
                  "Write a custom message to send to all selected recipients"
                }
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Send Messages</Button>
      </form>
    </Form>
  );
}