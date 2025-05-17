'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Area } from "../page";

interface SmsTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    areas: Area[];
}

interface SmsTemplate {
    id: number;
    name: string;
    content: string;
    created_at: string;
    area: number | null;
    area_details?: {
        id: number;
        name: string;
    } | null;
}

export function SmsTemplateDialog({ open, onOpenChange, areas }: SmsTemplateDialogProps) {
    const [templates, setTemplates] = useState<SmsTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);
    const [name, setName] = useState("");
    const [content, setContent] = useState("");
    const [activeTab, setActiveTab] = useState("create");
    const supabase = createClient();

    const availableVariables = [
        { name: "Customer Name", code: "{{name}}" },
        { name: "Phone Number", code: "{{phone_number}}" },
        { name: "Plan", code: "{{plan}}" },
        { name: "Due Date", code: "{{due_date}}" },
        { name: "Payment Status", code: "{{payment_status}}" },
    ];

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        const { data, error } = await supabase
            .from("sms_templates")
            .select("*, area_details:area(id, name)")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setTemplates(data);
        }
    };

    const handleInsertVariable = (variable: string) => {
        setContent(prev => prev + variable);
    };

    const [areaId, setAreaId] = useState<number | null>(null);
    
    useEffect(() => {
        if (selectedTemplate) {
            setAreaId(selectedTemplate.area);
        } else {
            setAreaId(null);
        }
    }, [selectedTemplate]);

    const handleCreateTemplate = async () => {
        if (!name || !content) return;

        const { data, error } = await supabase
            .from("sms_templates")
            .insert({ 
              name, 
              content,
              area: areaId
            })
            .select();

        if (!error && data) {
            setTemplates([data[0], ...templates]);
            setName("");
            setContent("");
            setAreaId(null);
            setActiveTab("manage");
        }
    };

    const handleUpdateTemplate = async () => {
        if (!selectedTemplate || !name || !content) return;

        const { data, error } = await supabase
            .from("sms_templates")
            .update({ 
                name, 
                content,
                area: areaId 
            })
            .eq("id", selectedTemplate.id)
            .select();

        if (!error && data) {
            setTemplates(templates.map(t => t.id === selectedTemplate.id ? data[0] : t));
            setSelectedTemplate(null);
            setName("");
            setContent("");
            setAreaId(null);
            setActiveTab("manage");
        }
    };

    const handleDeleteTemplate = async (id: number) => {
        if (!confirm("Are you sure you want to delete this template?")) return;

        const { error } = await supabase
            .from("sms_templates")
            .delete()
            .eq("id", id);

        if (!error) {
            setTemplates(templates.filter(t => t.id !== id));
            if (selectedTemplate?.id === id) {
                setSelectedTemplate(null);
                setName("");
                setContent("");
            }
        }
    };

    const handleEditTemplate = (template: SmsTemplate) => {
        setSelectedTemplate(template);
        setName(template.name);
        setContent(template.content);
        setActiveTab("edit");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>SMS Templates</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="create">Create</TabsTrigger>
                        <TabsTrigger value="edit" disabled={!selectedTemplate}>Edit</TabsTrigger>
                        <TabsTrigger value="manage">Manage</TabsTrigger>
                    </TabsList>

                    <TabsContent value="create" className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input
                                id="template-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Payment Reminder"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="template-area">Area</Label>
                            <Select 
                                value={areaId?.toString()} 
                                onValueChange={(value) => setAreaId(value === "null" ? null : parseInt(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an area" />
                                </SelectTrigger>
                                <SelectContent>
                                    {areas.map((area) => (
                                        <SelectItem key={area.id} value={area.id.toString()}>
                                            {area.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="template-content">Message Content</Label>
                            <Textarea
                                id="template-content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Type your message here. Use variables like {{name}} for dynamic content."
                                className="min-h-[150px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Available Variables</Label>
                            <div className="flex flex-wrap gap-2">
                                {availableVariables.map((variable) => (
                                    <Badge 
                                        key={variable.code} 
                                        variant="outline" 
                                        className="cursor-pointer hover:bg-secondary"
                                        onClick={() => handleInsertVariable(variable.code)}
                                    >
                                        {variable.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <Button onClick={handleCreateTemplate} className="w-full">
                            Create Template
                        </Button>
                    </TabsContent>

                    <TabsContent value="edit" className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-template-name">Template Name</Label>
                            <Input
                                id="edit-template-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-template-area">Area</Label>
                            <Select 
                                value={areaId?.toString()} 
                                onValueChange={(value) => setAreaId(value === "null" ? null : parseInt(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an area" />
                                </SelectTrigger>
                                <SelectContent>
                                    {areas.map((area) => (
                                        <SelectItem key={area.id} value={area.id.toString()}>
                                            {area.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-template-content">Message Content</Label>
                            <Textarea
                                id="edit-template-content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="min-h-[150px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Available Variables</Label>
                            <div className="flex flex-wrap gap-2">
                                {availableVariables.map((variable) => (
                                    <Badge 
                                        key={variable.code} 
                                        variant="outline" 
                                        className="cursor-pointer hover:bg-secondary"
                                        onClick={() => handleInsertVariable(variable.code)}
                                    >
                                        {variable.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <Button onClick={handleUpdateTemplate} className="w-full">
                            Update Template
                        </Button>
                    </TabsContent>

                    <TabsContent value="manage" className="space-y-4">
                        {templates.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                                No templates found. Create one to get started.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {templates.map((template) => (
                                    <div 
                                        key={template.id} 
                                        className="flex items-center justify-between p-3 border rounded-md"
                                    >
                                        <div>
                                            <h4 className="font-medium">{template.name}</h4>
                                            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                                {template.content}
                                            </p>
                                            {template.area_details?.name ? (
                                                <Badge variant="secondary" className="mt-1">
                                                    {template.area_details.name}
                                                </Badge>
                                            ) : template.area ? (
                                                <Badge variant="secondary" className="mt-1">
                                                    Area ID: {template.area}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="mt-1">
                                                    All Areas
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleEditTemplate(template)}
                                            >
                                                Edit
                                            </Button>
                                            <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => handleDeleteTemplate(template.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}