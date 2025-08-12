import React, { useState, useEffect, useRef } from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search, Users, Settings, FileText, BarChart, Plus, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const commands = [
  {
    group: 'Navigation',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart, shortcut: '⌘ D', path: '/' },
      { id: 'students', label: 'Students', icon: Users, shortcut: '⌘ S', path: '/students' },
      { id: 'batches', label: 'Batches', icon: FileText, shortcut: '⌘ B', path: '/batches' },
      { id: 'settings', label: 'Settings', icon: Settings, shortcut: '⌘ ,', path: '/admin/settings' },
    ]
  },
  {
    group: 'Actions',
    items: [
      { id: 'add-student', label: 'Add Student', icon: Plus, shortcut: '⌘ N', action: 'add-student' },
      { id: 'add-batch', label: 'Create Batch', icon: Plus, shortcut: '⌘ ⇧ N', action: 'add-batch' },
      { id: 'logout', label: 'Log Out', icon: LogOut, shortcut: '⌘ ⇧ Q', action: 'logout' },
    ]
  }
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSelect = (item: any) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.action) {
      // Handle actions
      switch (item.action) {
        case 'add-student':
          navigate('/students/add');
          break;
        case 'add-batch':
          // Add batch creation logic
          break;
        case 'logout':
          // Add logout logic
          break;
      }
    }
    onOpenChange(false);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-2xl">
        <CommandPrimitive 
          className="flex flex-col rounded-lg border border-border bg-background shadow-2xl"
          shouldFilter={false}
        >
          <div className="flex items-center border-b border-border px-4">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search commands..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          <CommandPrimitive.List className="max-h-[300px] overflow-y-auto p-2">
            <CommandPrimitive.Empty className="py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </CommandPrimitive.Empty>
            
            {commands.map((group) => (
              <CommandPrimitive.Group key={group.group} heading={group.group}>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {group.group}
                </div>
                {group.items
                  .filter(item => 
                    search === '' || 
                    item.label.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((item) => (
                    <CommandPrimitive.Item
                      key={item.id}
                      value={item.label}
                      onSelect={() => handleSelect(item)}
                      className={cn(
                        "relative flex cursor-default select-none items-center rounded-md px-2 py-2 text-sm outline-none",
                        "data-[selected]:bg-accent data-[selected]:text-accent-foreground",
                        "hover:bg-accent hover:text-accent-foreground",
                        "transition-colors duration-150"
                      )}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      {item.shortcut && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {item.shortcut}
                        </span>
                      )}
                    </CommandPrimitive.Item>
                  ))}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}