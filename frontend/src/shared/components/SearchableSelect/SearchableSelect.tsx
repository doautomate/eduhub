import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  id: string;
  label: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Small first-party searchable dropdown (ARIA combobox/listbox) used for the
 * country and state/province fields on Register/Profile. Users can either
 * click to browse the full option list or type to filter it, then pick a
 * value from the filtered results (FR-010/FR-012, research.md decision 4).
 */
export function SearchableSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  // Keep the visible text in sync when the selected value changes externally
  // (e.g. a parent resets the state/province field after the country changes).
  useEffect(() => {
    setQuery(selectedOption ? selectedOption.label : "");
  }, [selectedOption]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized || (selectedOption && selectedOption.label.toLowerCase() === normalized)) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query, selectedOption]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectOption(option: SearchableSelectOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filteredOptions.length === 1) {
        selectOption(filteredOptions[0]);
      }
    } else if (event.key === "ArrowDown" && !open) {
      setOpen(true);
    }
  }

  return (
    <div className="searchable-select relative space-y-2" ref={containerRef}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          value={query}
          className="h-10 bg-background pr-10 pl-9"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) {
              onChange("");
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {open && !disabled && (
        <ul
          className="searchable-select__listbox absolute top-full z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
          role="listbox"
          id={listboxId}
        >
          {filteredOptions.length === 0 && (
            <li className="searchable-select__empty px-3 py-2 text-sm text-muted-foreground" aria-disabled="true">
              No matches
            </li>
          )}
          {filteredOptions.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(option);
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <CheckIcon className="ml-auto size-4" /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchableSelect;
