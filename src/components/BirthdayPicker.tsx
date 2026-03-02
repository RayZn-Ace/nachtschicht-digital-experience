import { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BirthdayPickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
const months = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const BirthdayPicker = ({ value, onChange, className, placeholder = "Geburtsdatum wählen" }: BirthdayPickerProps) => {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const validDate = selectedDate && isValid(selectedDate) ? selectedDate : undefined;

  const [displayMonth, setDisplayMonth] = useState<Date>(
    validDate || new Date(currentYear - 20, 0, 1)
  );

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  const handleMonthChange = (month: string) => {
    const newMonth = months.indexOf(month);
    const updated = new Date(displayMonth);
    updated.setMonth(newMonth);
    setDisplayMonth(updated);
  };

  const handleYearChange = (year: string) => {
    const updated = new Date(displayMonth);
    updated.setFullYear(parseInt(year));
    setDisplayMonth(updated);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-secondary border-border hover:bg-secondary/80",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {validDate ? format(validDate, "dd. MMMM yyyy", { locale: de }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex gap-2 p-3 pb-0">
          <Select
            value={months[displayMonth.getMonth()]}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={displayMonth.getFullYear().toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Calendar
          mode="single"
          selected={validDate}
          onSelect={handleSelect}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          disabled={(date) => date > new Date()}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
          locale={de}
        />
      </PopoverContent>
    </Popover>
  );
};

export default BirthdayPicker;
