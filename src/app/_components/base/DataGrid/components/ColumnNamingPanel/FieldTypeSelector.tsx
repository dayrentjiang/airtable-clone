"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Search,
  Type,
  Hash,
  Link2,
  AlignLeft,
  File,
  CheckSquare,
  Calendar,
  User,
  Phone,
  Mail,
  Link,
  DollarSign,
} from "lucide-react";

export type FieldType = "TEXT" | "NUMBER";

interface FieldTypeOption {
  value: FieldType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  disabled?: boolean;
}

interface AllFieldTypeOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  iconRight?: React.ReactNode;
}

const FIELD_TYPES: FieldTypeOption[] = [
  { value: "TEXT", label: "Single line text", icon: Type },
  { value: "NUMBER", label: "Number", icon: Hash },
];

// All field types from the image (most are non-functional)
const ALL_FIELD_TYPES: AllFieldTypeOption[] = [
  { 
    value: "LINK", 
    label: "Link to another record", 
    icon: Link2, 
    disabled: true,
    iconRight: <ChevronDown className="ml-auto h-3 w-3 -rotate-90 text-gray-400" />
  },
  { value: "TEXT", label: "Single line text", icon: Type },
  { value: "LONG_TEXT", label: "Long text", icon: AlignLeft, disabled: true },
  { value: "ATTACHMENT", label: "Attachment", icon: File, disabled: true },
  { value: "CHECKBOX", label: "Checkbox", icon: CheckSquare, disabled: true },
  { value: "MULTIPLE_SELECT", label: "Multiple select", icon: ChevronDown, disabled: true },
  { value: "SINGLE_SELECT", label: "Single select", icon: ChevronDown, disabled: true },
  { value: "USER", label: "User", icon: User, disabled: true },
  { value: "DATE", label: "Date", icon: Calendar, disabled: true },
  { value: "PHONE", label: "Phone number", icon: Phone, disabled: true },
  { value: "EMAIL", label: "Email", icon: Mail, disabled: true },
  { value: "URL", label: "URL", icon: Link, disabled: true },
  { value: "NUMBER", label: "Number", icon: Hash },
  { value: "CURRENCY", label: "Currency", icon: DollarSign, disabled: true },
];

interface FieldTypeSelectorProps {
  selectedType: FieldType;
  onTypeChange: (type: FieldType) => void;
}

export function FieldTypeSelector({
  selectedType,
  onTypeChange,
}: FieldTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = FIELD_TYPES.find((ft) => ft.value === selectedType);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const filteredTypes = ALL_FIELD_TYPES.filter((type) =>
    type.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (type: AllFieldTypeOption) => {
    if (!type.disabled && (type.value === "TEXT" || type.value === "NUMBER")) {
      onTypeChange(type.value as FieldType);
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <div className="relative mb-3" ref={dropdownRef}>
      {/* Selected field type button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <div className="flex items-center gap-2">
          {selectedOption?.icon && (
            <selectedOption.icon className="h-4 w-4 text-gray-600" />
          )}
          <span>{selectedOption?.label}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-gray-200 p-2">
            <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a field type"
                className="flex-1 border-none bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
                autoFocus
              />
            </div>
          </div>

          {/* Field type options */}
          <div className="max-h-80 overflow-y-auto">
            {filteredTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleSelect(type)}
                  disabled={type.disabled}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-xs ${
                    type.disabled
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-gray-50"
                  } ${
                    type.value === selectedType
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-900"
                  }`}
                >
                  <IconComponent className="h-4 w-4 text-gray-600" />
                  <span>{type.label}</span>
                  {type.iconRight}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
