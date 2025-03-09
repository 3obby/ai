"use client";

import { useState } from "react";
import { allTemplates, getTemplatesByCategory, TemplateCategory } from "./ChatConfigTemplates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatConfigManifest } from "./ChatConfigTypes";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TemplateSelectorProps {
  onSelect: (config: ChatConfigManifest) => void;
  onCancel: () => void;
}

export const TemplateSelector = ({
  onSelect,
  onCancel
}: TemplateSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "all">("all");
  
  // Filter templates based on search and category
  const filteredTemplates = allTemplates.filter(template => {
    // Filter by search query
    const matchesSearch = searchQuery === "" || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by category
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Group templates by category
  const templatesByCategory = Object.values(TemplateCategory).reduce((acc, category) => {
    acc[category] = filteredTemplates.filter(template => template.category === category);
    return acc;
  }, {} as Record<string, typeof allTemplates>);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as TemplateCategory | "all")}>
        <TabsList className="grid grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value={TemplateCategory.WORKFLOW}>Workflow</TabsTrigger>
          <TabsTrigger value={TemplateCategory.COLLABORATION}>Collaboration</TabsTrigger>
          <TabsTrigger value={TemplateCategory.EDUCATION}>Education</TabsTrigger>
          <TabsTrigger value={TemplateCategory.ENTERTAINMENT}>Entertainment</TabsTrigger>
          <TabsTrigger value={TemplateCategory.UTILITY}>Utility</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {Object.entries(templatesByCategory).map(([category, templates]) => (
                templates.length > 0 ? (
                  <div key={category} className="space-y-3">
                    <h3 className="font-semibold text-lg capitalize">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map(template => (
                        <TemplateCard 
                          key={template.id}
                          name={template.name}
                          description={template.description}
                          category={template.category}
                          onSelect={() => onSelect(template.config)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null
              ))}
              
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No templates found matching your search.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        {Object.values(TemplateCategory).map((category) => (
          <TabsContent key={category} value={category} className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templatesByCategory[category].map(template => (
                  <TemplateCard 
                    key={template.id}
                    name={template.name}
                    description={template.description}
                    category={template.category}
                    onSelect={() => onSelect(template.config)}
                  />
                ))}
              </div>
              
              {templatesByCategory[category].length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No templates found matching your search.
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

interface TemplateCardProps {
  name: string;
  description: string;
  category: string;
  onSelect: () => void;
}

const TemplateCard = ({
  name,
  description,
  category,
  onSelect
}: TemplateCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge variant="secondary" className="capitalize">{category}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="pt-2">
        <Button onClick={onSelect} size="sm" className="ml-auto">
          Use Template
        </Button>
      </CardFooter>
    </Card>
  );
}; 