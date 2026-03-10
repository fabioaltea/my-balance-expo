import React from "react";
import {
  ContextMenu as ExpoContextMenu,
  Host,
  Button,
  Divider,
  ActivationMethod,
} from "@expo/ui/swift-ui";
import type { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
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
  hostStyle?: { width: number; height: number };
  activationMethod: ActivationMethod;
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
  hostStyle,
  activationMethod = "longPress",
}) => {
  return (
    <Host {...(hostStyle ? { style: hostStyle } : { matchContents: true })}>
      <ExpoContextMenu activationMethod={activationMethod} >
        <ExpoContextMenu.Trigger>
          <Pressable>{children}</Pressable>
        </ExpoContextMenu.Trigger>
        <ExpoContextMenu.Items>
          {options.map((option, index) => {
            const normalized = normalizeOption(option);
            const sfSymbol = normalized.icon
              ? SF_SYMBOL_MAP[normalized.icon]
              : undefined;

            return (
              <Button
                key={index}
                role={normalized.destructive ? "destructive" : "default"}
                {...(sfSymbol ? { systemImage: sfSymbol as any } : {})}
                onPress={() => onSelectOption(normalized.label)}
                disabled={normalized.disabled}
              >
                {normalized.label}
              </Button>
            );
          })}
        </ExpoContextMenu.Items>
      </ExpoContextMenu>
    </Host>
  );
};

export default ContextMenu;
