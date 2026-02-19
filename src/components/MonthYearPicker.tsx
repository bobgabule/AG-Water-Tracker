import Picker from 'react-mobile-picker';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 21 }, (_, i) => String(2020 + i));

interface MonthYearPickerProps {
  month: string; // '01' through '12'
  year: string;  // e.g., '2026'
  onChange: (month: string, year: string) => void;
}

export default function MonthYearPicker({ month, year, onChange }: MonthYearPickerProps) {
  const monthIndex = Math.max(0, parseInt(month, 10) - 1);
  const monthName = MONTHS[monthIndex] ?? 'Jan';

  const value = {
    month: monthName,
    year: YEARS.includes(year) ? year : '2026',
  };

  const handleChange = (newValue: { month: string; year: string }) => {
    const newMonthIndex = MONTHS.indexOf(newValue.month);
    const paddedMonth = String(newMonthIndex + 1).padStart(2, '0');
    onChange(paddedMonth, newValue.year);
  };

  return (
    <div className="rounded-lg overflow-hidden border border-gray-600" style={{ height: 200 }}>
      <Picker value={value} onChange={handleChange} wheelMode="natural">
        <Picker.Column name="month">
          {MONTHS.map((m) => (
            <Picker.Item key={m} value={m}>
              {() => <span className="text-white text-sm">{m}</span>}
            </Picker.Item>
          ))}
        </Picker.Column>
        <Picker.Column name="year">
          {YEARS.map((y) => (
            <Picker.Item key={y} value={y}>
              {() => <span className="text-white text-sm">{y}</span>}
            </Picker.Item>
          ))}
        </Picker.Column>
      </Picker>
    </div>
  );
}
