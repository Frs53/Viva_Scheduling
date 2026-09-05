import React, { useState, useRef, useEffect } from 'react';
import { Filter, Search, X, Check, CheckSquare, Square } from 'lucide-react';
import { ColumnDefinition } from '../types/defense';

interface ColumnFilterPopoverProps {
  column: ColumnDefinition;
  textFilter: string;
  selectedOptions: string[];
  onTextChange: (text: string) => void;
  onOptionToggle: (option: string) => void;
  onSelectAllOptions: (options: string[]) => void;
  onClearOptions: () => void;
  onResetColumnFilter: () => void;
  columnValuesCounts: Map<string, number>;
}

export const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({
  column,
  textFilter,
  selectedOptions,
  onTextChange,
  onOptionToggle,
  onSelectAllOptions,
  onClearOptions,
  onResetColumnFilter,
  columnValuesCounts,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const isFilterActive = textFilter.trim() !== '' || selectedOptions.length > 0;
  const uniqueOptions = column.uniqueValues || [];

  // Filter unique options based on local popover search
  const filteredUniqueOptions = uniqueOptions.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const allFilteredSelected =
    filteredUniqueOptions.length > 0 &&
    filteredUniqueOptions.every(opt => selectedOptions.includes(opt));

  return (
    <div className="relative inline-block text-right" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`فیلتر ستون ${column.label}`}
        className={`p-1 rounded-md transition-colors ${
          isFilterActive
            ? 'bg-emerald-500 text-black font-bold shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-[#16161a] border border-slate-700/80 rounded-xl shadow-2xl z-50 p-3 text-right text-slate-200 backdrop-blur-xl animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
            <span className="text-xs font-semibold text-white truncate max-w-[190px]">
              فیلتر: {column.label}
            </span>
            {isFilterActive && (
              <button
                onClick={onResetColumnFilter}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>حذف فیلتر</span>
              </button>
            )}
          </div>

          {/* Text Search Input */}
          <div className="relative mb-2.5">
            <input
              type="text"
              value={textFilter}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="جستجوی متنی در این ستون..."
              className="w-full bg-[#0e0e12] border border-slate-700/70 rounded-lg px-2.5 py-1.5 pr-7 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-2.5" />
            {textFilter && (
              <button
                onClick={() => onTextChange('')}
                className="absolute left-2 top-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categorical Multi-Select Options if available */}
          {uniqueOptions.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span>انتخاب مقادیر یکتا ({uniqueOptions.length})</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (allFilteredSelected) {
                        onClearOptions();
                      } else {
                        onSelectAllOptions(filteredUniqueOptions);
                      }
                    }}
                    className="text-emerald-400 hover:underline text-[10px]"
                  >
                    {allFilteredSelected ? 'لغو همه' : 'انتخاب همه'}
                  </button>
                  {selectedOptions.length > 0 && (
                    <button
                      onClick={onClearOptions}
                      className="text-slate-400 hover:text-slate-200 text-[10px]"
                    >
                      پاکسازی
                    </button>
                  )}
                </div>
              </div>

              {/* Local search within options if more than 5 */}
              {uniqueOptions.length > 5 && (
                <div className="mb-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجو در گزینه‌ها..."
                    className="w-full bg-[#111114] border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-600"
                  />
                </div>
              )}

              {/* Options List */}
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {filteredUniqueOptions.length === 0 ? (
                  <div className="text-[11px] text-slate-500 text-center py-2">
                    موردی یافت نشد
                  </div>
                ) : (
                  filteredUniqueOptions.map((option) => {
                    const isSelected = selectedOptions.includes(option);
                    const count = columnValuesCounts.get(option) || 0;
                    return (
                      <label
                        key={option}
                        onClick={() => onOptionToggle(option)}
                        className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer select-none transition-colors ${
                          isSelected
                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                            : 'hover:bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate max-w-[180px]">
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className="truncate">{option || '(خالی)'}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded shrink-0">
                          {count}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Done button */}
          <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              بستن و اعمال
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
