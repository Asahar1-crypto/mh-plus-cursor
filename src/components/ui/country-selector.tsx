import React, { useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCommonCountries } from '@/utils/phoneUtils';
import { CountryCode } from 'libphonenumber-js';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface CountrySelectorProps {
  value: CountryCode;
  onChange: (country: CountryCode) => void;
  disabled?: boolean;
  className?: string;
}

export function CountrySelector({ value, onChange, disabled, className }: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const countries = getCommonCountries();
  
  const selectedCountry = countries.find(country => country.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-12 sm:h-14 px-2 sm:px-3 rounded-xl",
            "bg-background/95 border-2 border-border shadow-sm",
            "hover:border-primary/50 transition-all duration-300",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <span className="text-lg sm:text-xl flex-shrink-0">{selectedCountry?.flag}</span>
            <span className="text-sm sm:text-base font-medium truncate">
              {selectedCountry?.callingCode}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="חפש מדינה..." 
            className="h-9"
          />
          <CommandEmpty>לא נמצאה מדינה.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  onSelect={() => {
                    onChange(country.code);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">{country.flag}</span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {country.nameHe || country.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {country.name} ({country.callingCode})
                      </span>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 flex-shrink-0",
                      value === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}