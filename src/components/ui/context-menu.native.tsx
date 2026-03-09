import React from "react";
import {
  ContextMenu as ExpoContextMenu,
  Host,
  Button,
  Divider,
} from "@expo/ui/swift-ui";
import { disabled } from "@expo/ui/swift-ui/modifiers";
import type { Ionicons } from "@expo/vector-icons";

export interface IContextMenuOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  destructive?: boolean;
  disabled?: boolean;
}

export interface IContextMenuProps {
  options: (string | IContextMenuOption)[];
  selectedOption?: string;
  onSelectOption: (option: string) => void;
  children: React.ReactNode;
}

// Map commonly used Ionicons names to SF Symbols
const SF_SYMBOL_MAP: Record<string, string> = {
  camera: "camera",
  "document-attach": "doc",
  "log-out-outline": "rectangle.portrait.and.arrow.right",
  "close-circle-outline": "xmark.circle",
  "trash-outline": "trash",
  "repeat-outline": "repeat",
  pencil: "pencil",
};

function normalizeOption(
  option: string | IContextMenuOption,
): IContextMenuOption {
  if (typeof option === "string") {
    return { label: option };
  }
  return option;
}

const ContextMenu: React.FC<IContextMenuProps> = ({
  options,
  onSelectOption,
  children,
}) => {
  return (
    <Host matchContents>
      <ExpoContextMenu>
        <ExpoContextMenu.Trigger>{children}</ExpoContextMenu.Trigger>
        <ExpoContextMenu.Items>
          {options.map((option, index) => {
            const normalized = normalizeOption(option);
            const sfSymbol = normalized.icon
              ? SF_SYMBOL_MAP[normalized.icon]
              : undefined;

            return (
              <Button
                key={index}
                label={normalized.label}
                role={normalized.destructive ? "destructive" : "default"}
                systemImage={sfSymbol as any}
                onPress={() => onSelectOption(normalized.label)}
                modifiers={
                  normalized.disabled ? [disabled(true)] : undefined
                }
              />
            );
          })}
        </ExpoContextMenu.Items>
      </ExpoContextMenu>
    </Host>
  );
};

export default ContextMenu;
