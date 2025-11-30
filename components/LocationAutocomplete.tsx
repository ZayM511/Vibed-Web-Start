"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Common US cities and states for autocomplete
const US_LOCATIONS = [
  // Major cities with states
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
  "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
  "Austin, TX", "Jacksonville, FL", "Fort Worth, TX", "Columbus, OH", "Charlotte, NC",
  "San Francisco, CA", "Indianapolis, IN", "Seattle, WA", "Denver, CO", "Washington, DC",
  "Boston, MA", "Nashville, TN", "Detroit, MI", "Portland, OR", "Las Vegas, NV",
  "Memphis, TN", "Louisville, KY", "Milwaukee, WI", "Albuquerque, NM", "Tucson, AZ",
  "Fresno, CA", "Mesa, AZ", "Sacramento, CA", "Atlanta, GA", "Kansas City, MO",
  "Miami, FL", "Raleigh, NC", "Omaha, NE", "Long Beach, CA", "Virginia Beach, VA",
  "Oakland, CA", "Minneapolis, MN", "Tampa, FL", "Tulsa, OK", "Arlington, TX",
  "New Orleans, LA", "Wichita, KS", "Cleveland, OH", "Bakersfield, CA", "Aurora, CO",
  // States
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
  // Remote/Other
  "Remote", "Remote (US)", "Remote (Global)", "International", "Prefer not to say",
];

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  label?: string;
  error?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "Enter your location...",
  label = "Location",
  error,
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter locations based on input
  useEffect(() => {
    if (value.trim().length > 0) {
      const filtered = US_LOCATIONS.filter((location) =>
        location.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredLocations(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setFilteredLocations([]);
      setIsOpen(false);
    }
    setHighlightedIndex(-1);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredLocations.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredLocations.length) {
          onChange(filteredLocations[highlightedIndex]);
          setIsOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (location: string) => {
    onChange(location);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="location" className="text-white flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label}
        {required && <span className="text-red-400">*</span>}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="location"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "bg-white/5 border-white/10 text-white placeholder:text-white/30 disabled:opacity-50",
            error && "border-red-400 focus-visible:ring-red-400"
          )}
          autoComplete="off"
        />

        {/* Dropdown */}
        {isOpen && filteredLocations.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-gray-900 border border-white/10 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredLocations.map((location, index) => (
              <button
                key={location}
                type="button"
                onClick={() => handleSelect(location)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm transition-colors",
                  "hover:bg-white/10",
                  highlightedIndex === index && "bg-white/10",
                  value === location ? "text-indigo-400" : "text-white"
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <span>{location}</span>
                  {value === location && <Check className="h-4 w-4 text-indigo-400" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!error && (
        <p className="text-xs text-white/40">
          Start typing to see location suggestions
        </p>
      )}
    </div>
  );
}
