import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Fonts } from '@/src/constants/theme';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import ContextMenu from './context-menu.web';

interface FormSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  accessibilityLabel: string;
  placeholder: string;
  textAlign?: 'left' | 'right';
  style?: React.CSSProperties;
}

export default function FormSelect({
  value,
  onChange,
  options,
  accessibilityLabel,
  placeholder,
  textAlign = 'left',
  style,
}: FormSelectProps) {
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const placeholderColor = useThemeColor({ light: '#77847D', dark: '#929C97' }, 'tabIconDefault');
  const selectedLabel = options.find((option) => option.value === value)?.label || value;

  return (
    <div style={{ flex: 1, minWidth: 0, ...style }}>
      <ContextMenu
        accessibilityLabel={`${accessibilityLabel}: ${selectedLabel || placeholder}`}
        align="start"
        itemSpacing={4}
        options={options}
        selectedOption={value}
        onSelectOption={onChange}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 36,
            padding: '0 10px',
            fontFamily: Fonts.sans,
            fontSize: 15,
            fontWeight: 500,
            color: value ? textColor : placeholderColor,
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign,
            }}
          >
            {selectedLabel || placeholder}
          </span>
          <MaterialIcons name="expand-more" size={18} color={textColor} />
        </div>
      </ContextMenu>
    </div>
  );
}
