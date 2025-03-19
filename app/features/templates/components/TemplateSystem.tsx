'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Plus, 
  Share2, 
  Star, 
  Copy, 
  X,
  Check,
  ChevronDown
} from 'lucide-react';
import { Input } from '@/app/shared/components/ui/input';
import { Button } from '@/app/shared/components/ui/button';
import { Badge } from '@/app/shared/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/app/shared/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/app/shared/components/ui/dropdown-menu';
import { ServerAvatar } from '@/app/shared/components/ui/server-avatar';
import { useToast } from '@/app/shared/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/shared/components/ui/tabs';
import { Textarea } from '@/app/shared/components/ui/textarea';
import { TemplatePreview } from './TemplatePreview';

// Template types
export type TemplateType = 'chat' | 'companion' | 'group';

export interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  category: string;
  tags: string[];
  popularity: number;
  isOfficial: boolean;
  isFeatured: boolean;
  isStarred?: boolean;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  previewImage?: string;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface TemplateSystemProps {
  templates: Template[];
  categories: string[];
  onCreateTemplate?: (type: TemplateType) => void;
  onTemplateSelect?: (template: Template) => void;
}

export default function TemplateSystem({
  templates: initialTemplates,
  categories,
  onCreateTemplate,
  onTemplateSelect
}: TemplateSystemProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>(initialTemplates);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<TemplateType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showOnlyOfficial, setShowOnlyOfficial] = useState(false);
  const [showOnlyStarred, setShowOnlyStarred] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'oldest'>('popular');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Handle search and filtering
  useEffect(() => {
    let filtered = [...templates];
    
    // Search filter
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(lowerCaseSearch) ||
        template.description.toLowerCase().includes(lowerCaseSearch) ||
        template.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(template => template.type === selectedType);
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }
    
    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(template => 
        selectedTags.every(tag => template.tags.includes(tag))
      );
    }
    
    // Official filter
    if (showOnlyOfficial) {
      filtered = filtered.filter(template => template.isOfficial);
    }
    
    // Starred filter
    if (showOnlyStarred) {
      filtered = filtered.filter(template => template.isStarred);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.popularity - a.popularity;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });
    
    setFilteredTemplates(filtered);
  }, [templates, searchTerm, selectedType, selectedCategory, selectedTags, showOnlyOfficial, showOnlyStarred, sortBy]);

  // Toggle star on a template
  const toggleStar = (templateId: string) => {
    setTemplates(templates.map(template => 
      template.id === templateId 
        ? { ...template, isStarred: !template.isStarred } 
        : template
    ));
    
    const template = templates.find(t => t.id === templateId);
    toast({
      title: template?.isStarred ? "Removed from favorites" : "Added to favorites",
      description: `"${template?.name}" has been ${template?.isStarred ? "removed from" : "added to"} your favorites.`,
    });
  };

  // Share template
  const handleShare = (template: Template) => {
    setSelectedTemplate(template);
    
    // Generate a shareable link
    const shareableLink = `${window.location.origin}/templates/share/${template.id}`;
    setShareLink(shareableLink);
    
    setShareDialogOpen(true);
    setLinkCopied(false);
  };
  
  // Copy link to clipboard
  const copyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to your clipboard.",
        variant: "destructive"
      });
    });
  };
  
  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };
  
  // Extract all available tags from templates
  const allTags = Array.from(new Set(templates.flatMap(template => template.tags)));
  
  // Toggle a tag selection
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedTags([]);
    setShowOnlyOfficial(false);
    setShowOnlyStarred(false);
    setSortBy('popular');
  };

  return (
    <div className="w-full space-y-6">
      {/* Search and filter bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <button 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          {/* Type filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Type
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className={selectedType === 'all' ? 'bg-primary/10' : ''}
                onClick={() => setSelectedType('all')}
              >
                All Types
                {selectedType === 'all' && <Check className="h-4 w-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={selectedType === 'chat' ? 'bg-primary/10' : ''}
                onClick={() => setSelectedType('chat')}
              >
                Chat Templates
                {selectedType === 'chat' && <Check className="h-4 w-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={selectedType === 'companion' ? 'bg-primary/10' : ''}
                onClick={() => setSelectedType('companion')}
              >
                Companion Templates
                {selectedType === 'companion' && <Check className="h-4 w-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={selectedType === 'group' ? 'bg-primary/10' : ''}
                onClick={() => setSelectedType('group')}
              >
                Group Chat Templates
                {selectedType === 'group' && <Check className="h-4 w-4 ml-2" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Category filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                Category
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className={selectedCategory === 'all' ? 'bg-primary/10' : ''}
                onClick={() => setSelectedCategory('all')}
              >
                All Categories
                {selectedCategory === 'all' && <Check className="h-4 w-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {categories.map(category => (
                <DropdownMenuItem
                  key={category}
                  className={selectedCategory === category ? 'bg-primary/10' : ''}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                  {selectedCategory === category && <Check className="h-4 w-4 ml-2" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                More Filters
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setShowOnlyOfficial(!showOnlyOfficial)}
              >
                <div className="flex items-center w-full">
                  <span className="flex-1">Official Templates Only</span>
                  {showOnlyOfficial && <Check className="h-4 w-4 ml-2" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowOnlyStarred(!showOnlyStarred)}
              >
                <div className="flex items-center w-full">
                  <span className="flex-1">Favorites Only</span>
                  {showOnlyStarred && <Check className="h-4 w-4 ml-2" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={sortBy === 'popular' ? 'bg-primary/10' : ''}
                onClick={() => setSortBy('popular')}
              >
                Sort by: Most Popular
                {sortBy === 'popular' && <Check className="h-4 w-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={sortBy === 'newest' ? 'bg-primary/10' : ''}
                onClick={() => setSortBy('newest')}
              >
                Sort by: Newest
                {sortBy === 'newest' && <Check className="h-4 w-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={sortBy === 'oldest' ? 'bg-primary/10' : ''}
                onClick={() => setSortBy('oldest')}
              >
                Sort by: Oldest
                {sortBy === 'oldest' && <Check className="h-4 w-4 ml-2" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create new button */}
          {onCreateTemplate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onCreateTemplate('chat')}>
                  Chat Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateTemplate('companion')}>
                  Companion Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateTemplate('group')}>
                  Group Chat Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* Active filters */}
      {(selectedType !== 'all' || selectedCategory !== 'all' || selectedTags.length > 0 || showOnlyOfficial || showOnlyStarred || sortBy !== 'popular') && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedType !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
              <button onClick={() => setSelectedType('all')} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedCategory !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Category: {selectedCategory}
              <button onClick={() => setSelectedCategory('all')} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedTags.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              #{tag}
              <button onClick={() => toggleTag(tag)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {showOnlyOfficial && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Official Only
              <button onClick={() => setShowOnlyOfficial(false)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {showOnlyStarred && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Favorites Only
              <button onClick={() => setShowOnlyStarred(false)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {sortBy !== 'popular' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Sort: {sortBy === 'newest' ? 'Newest' : 'Oldest'}
              <button onClick={() => setSortBy('popular')} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-sm">
            Clear All
          </Button>
        </div>
      )}
      
      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {allTags.map(tag => (
          <Badge 
            key={tag} 
            variant={selectedTags.includes(tag) ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/20"
            onClick={() => toggleTag(tag)}
          >
            #{tag}
          </Badge>
        ))}
      </div>
      
      {/* Template grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="overflow-hidden flex flex-col">
              <div 
                className="aspect-video bg-muted/50 relative cursor-pointer" 
                onClick={() => handleTemplateSelect(template)}
              >
                {template.previewImage ? (
                  <img 
                    src={template.previewImage} 
                    alt={template.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ServerAvatar
                      src={template.type === 'companion' 
                        ? '/images/companion-default.png'
                        : template.type === 'group'
                          ? '/images/group-chat.png'
                          : '/images/chat-default.png'
                      }
                      alt={template.name}
                      className="h-20 w-20 opacity-30"
                    />
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-2">
                  <Badge 
                    variant="secondary" 
                    className="bg-background/80 backdrop-blur-sm"
                  >
                    {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                  </Badge>
                  {template.isOfficial && (
                    <Badge className="bg-primary/80 backdrop-blur-sm">
                      Official
                    </Badge>
                  )}
                </div>
                {/* Star button */}
                <button 
                  className={`absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full ${
                    template.isStarred ? 'bg-primary text-primary-foreground' : 'bg-background/80 text-foreground hover:bg-background'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(template.id);
                  }}
                >
                  <Star className="h-4 w-4" fill={template.isStarred ? 'currentColor' : 'none'} />
                </button>
              </div>
              
              <CardContent className="flex-1 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold truncate">{template.name}</h3>
                    <p className="text-xs text-muted-foreground">{template.category}</p>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{template.popularity}</span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{template.description}</p>
                
                <div className="flex items-center gap-2 mt-3">
                  <ServerAvatar
                    src={template.author.avatarUrl || `/images/user-avatar.png`}
                    alt={template.author.name}
                    className="h-5 w-5"
                  />
                  <span className="text-xs text-muted-foreground">{template.author.name}</span>
                </div>
              </CardContent>
              
              <CardFooter className="p-4 pt-0 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleTemplateSelect(template)}
                >
                  Use Template
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleShare(template)}
                  title="Share template"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No templates match your filters.</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
        </div>
      )}
      
      {/* Share dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Template</DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <ServerAvatar
                  src={selectedTemplate.type === 'companion' 
                    ? '/images/companion-default.png'
                    : selectedTemplate.type === 'group'
                      ? '/images/group-chat.png'
                      : '/images/chat-default.png'
                  }
                  alt={selectedTemplate.name}
                  className="h-10 w-10"
                />
                <div>
                  <h3 className="font-semibold">{selectedTemplate.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedTemplate.type.charAt(0).toUpperCase() + selectedTemplate.type.slice(1)} Template
                  </p>
                </div>
              </div>
              
              <Tabs defaultValue="link">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="link">Share Link</TabsTrigger>
                  <TabsTrigger value="embed">Embed Code</TabsTrigger>
                </TabsList>
                
                <TabsContent value="link" className="pt-4">
                  <div className="flex items-center gap-2">
                    <Input 
                      value={shareLink} 
                      readOnly 
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={copyLink}
                      className={linkCopied ? 'text-green-500' : ''}
                    >
                      {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="embed" className="pt-4">
                  <div className="space-y-2">
                    <Textarea 
                      readOnly 
                      value={`<iframe src="${window.location.origin}/templates/embed/${selectedTemplate.id}" width="100%" height="500" frameborder="0"></iframe>`}
                      onClick={(e) => e.currentTarget.select()}
                      className="h-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      Copy this code to embed this template on your website.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 